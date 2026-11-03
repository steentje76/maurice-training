package com.trainingskompas.app;

import android.app.Dialog;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Feature-gated native MoveKit offline vault + player.
 * Product owner has attested permission for non-exportable app-private encryption.
 * DEBUG only until device acceptance, server entitlements and V2 migration pass.
 * No media plaintext is provided to JS or the file system.
 */
@CapacitorPlugin(name="TkOfflineMedia")
public class TkOfflineMediaPlugin extends Plugin {
    private final ExecutorService work=Executors.newSingleThreadExecutor();
    private volatile String activeOwner=null;
    private volatile Dialog player=null;
    private volatile TkMediaIntegrity registry;
    private volatile TkMediaVault vault;
    private static final String TRUSTED_HOST="mhfxhzkdmgkaplicdszg.supabase.co";

    private boolean enabled(){
        return BuildConfig.DEBUG&&Build.VERSION.SDK_INT>=Build.VERSION_CODES.M;
    }
    private void needEnabled(PluginCall call){
        if(!enabled())throw new IllegalStateException("OFFLINE_MEDIA_NOT_RELEASED");
    }
    private TkMediaIntegrity reg()throws Exception{
        if(registry==null){synchronized(this){if(registry==null)registry=new TkMediaIntegrity(getContext());}}
        return registry;
    }
    private TkMediaVault vault(){
        if(vault==null){synchronized(this){if(vault==null)vault=new TkMediaVault(getContext());}}
        return vault;
    }
    private String checkActive(){
        String owner=activeOwner;
        if(owner==null)throw new SecurityException("OFFLINE_ACCOUNT_NOT_ACTIVE");
        return owner;
    }
    private TkMediaIntegrity.Entry descriptor(PluginCall call)throws Exception {
        String id=call.getString("catalogId"),version=call.getString("version");
        if(id==null||version==null)throw new SecurityException("MISSING_MEDIA_ID");
        return reg().find(id,version);
    }
    private boolean isWifi(){
        ConnectivityManager cm=(ConnectivityManager)getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        if(cm==null)return false;
        Network n=cm.getActiveNetwork();
        NetworkCapabilities cap=n==null?null:cm.getNetworkCapabilities(n);
        return cap!=null&&cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                &&cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
    }
    private static URL validateSigned(String raw,TkMediaIntegrity.Entry entry)throws Exception {
        if(raw==null||raw.length()<90||raw.length()>8192)throw new SecurityException("INVALID_MEDIA_URL");
        URL u=new URL(raw);
        if(!"https".equalsIgnoreCase(u.getProtocol())||!TRUSTED_HOST.equalsIgnoreCase(u.getHost())
            ||(u.getPort()!=-1&&u.getPort()!=443)||u.getUserInfo()!=null||u.getRef()!=null
            ||!("/storage/v1/object/sign/exercise-media/"+entry.storagePath()).equals(u.getPath()))
            throw new SecurityException("UNTRUSTED_MEDIA_URL");
        String query=u.getQuery();
        if(query==null||!query.matches("token=[A-Za-z0-9._~-]{8,4096}"))throw new SecurityException("MEDIA_TOKEN_INVALID");
        return u;
    }
    @PluginMethod public void capabilities(PluginCall call){
        JSObject out=new JSObject();
        out.put("available",enabled());
        out.put("state",enabled()?"DEBUG_ACCEPTANCE_ONLY":"NOT_RELEASED");
        out.put("encrypted",true);
        out.put("privateStorage",true);
        out.put("nativePlayer",true);
        out.put("wifiOnlyDefault",true);
        out.put("quotaBytes",TkMediaVault.QUOTA);
        out.put("exportAllowed",false);
        call.resolve(out);
    }
    @PluginMethod public void activateAccount(PluginCall call){
        try{
            needEnabled(call);
            String uid=TkMediaVault.checkOwner(call.getString("ownerId"));
            // Authentication and entitlement are established by Supabase JS
            // session before calling here; do not claim this is an auth proof.
            if(activeOwner!=null&&!activeOwner.equals(uid))
                throw new SecurityException("LOGOUT_REQUIRED_BEFORE_ACCOUNT_SWITCH");
            activeOwner=uid;
            call.resolve();
        }catch(Exception e){call.reject(e.getMessage());}
    }
    @PluginMethod public void status(PluginCall call){
        try{
            needEnabled(call);
            String owner=checkActive();
            TkMediaIntegrity.Entry entry=descriptor(call);
            JSObject out=new JSObject();
            out.put("cached",vault().has(owner,entry));
            out.put("bytes",entry.bytes);
            out.put("quotaUsedBytes",vault().usedBytes(owner));
            out.put("wifi",isWifi());
            out.put("catalogId",entry.catalogId);
            out.put("version",entry.version);
            call.resolve(out);
        }catch(Exception e){call.reject(e.getMessage());}
    }
    @PluginMethod public void download(PluginCall call){
        final String owner;
        final TkMediaIntegrity.Entry entry;
        final URL url;
        try{
            needEnabled(call);
            owner=checkActive();
            entry=descriptor(call);
            if(!isWifi()&&!Boolean.TRUE.equals(call.getBoolean("allowMetered",false)))
                throw new SecurityException("WIFI_REQUIRED");
            // Signed URL comes from authenticated Netlify broker, not an arbitrary
            // user download URL. Native integrity digest is in packaged manifest.
            url=validateSigned(call.getString("signedUrl"),entry);
        }catch(Exception e){call.reject(e.getMessage());return;}
        work.execute(()->{
            HttpURLConnection conn=null;
            try{
                if(!owner.equals(checkActive()))throw new SecurityException("ACCOUNT_CHANGED");
                if(vault().has(owner,entry)){
                    JSObject r=new JSObject();r.put("cached",true);r.put("downloadedBytes",0);call.resolve(r);return;
                }
                conn=(HttpURLConnection)url.openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(15000);conn.setReadTimeout(45000);
                conn.setRequestProperty("Accept-Encoding","identity");
                conn.setRequestProperty("Cache-Control","no-store");
                int status=conn.getResponseCode();
                if(status!=200)throw new SecurityException("PRIVATE_MEDIA_HTTP_"+status);
                long length=conn.getContentLengthLong();
                if(length!=-1&&length!=entry.bytes)throw new SecurityException("MEDIA_LENGTH_INVALID");
                String mime=conn.getContentType();
                if(mime!=null&&!mime.toLowerCase(Locale.ROOT).startsWith("video/mp4"))
                    throw new SecurityException("MEDIA_MIME_INVALID");
                long n;
                try(InputStream input=conn.getInputStream()){
                    n=vault().store(owner,entry,input);
                }
                if(!owner.equals(checkActive())){
                    vault().remove(owner,entry);
                    throw new SecurityException("ACCOUNT_CHANGED");
                }
                JSObject result=new JSObject();
                result.put("cached",true);result.put("downloadedBytes",n);
                result.put("catalogId",entry.catalogId);result.put("version",entry.version);
                call.resolve(result);
            }catch(Exception e){call.reject(e.getMessage());}
            finally{if(conn!=null)conn.disconnect();}
        });
    }
    @PluginMethod public void play(PluginCall call){
        try{
            needEnabled(call);
            String owner=checkActive();
            TkMediaIntegrity.Entry entry=descriptor(call);
            if(!vault().has(owner,entry))throw new SecurityException("OFFLINE_VIDEO_NOT_CACHED");
            getActivity().runOnUiThread(()->{
                try{
                    if(!owner.equals(checkActive()))throw new SecurityException("ACCOUNT_CHANGED");
                    if(player!=null){player.dismiss();player=null;}
                    player=TkOfflineVideoPlayer.show(getActivity(),vault(),owner,entry);
                    call.resolve();
                }catch(Exception e){call.reject(e.getMessage());}
            });
        }catch(Exception e){call.reject(e.getMessage());}
    }
    @PluginMethod public void remove(PluginCall call){
        try{
            needEnabled(call);
            String owner=checkActive();
            TkMediaIntegrity.Entry entry=descriptor(call);
            work.execute(()->{
                try{
                    if(!owner.equals(checkActive()))throw new SecurityException("ACCOUNT_CHANGED");
                    getActivity().runOnUiThread(()->{if(player!=null){player.dismiss();player=null;}});
                    vault().remove(owner,entry);
                    call.resolve();
                }catch(Exception e){call.reject(e.getMessage());}
            });
        }catch(Exception e){call.reject(e.getMessage());}
    }
    @PluginMethod public void logoutAndWipe(PluginCall call){
        try{
            needEnabled(call);
            final String owner=checkActive();
            activeOwner=null;
            getActivity().runOnUiThread(()->{if(player!=null){player.dismiss();player=null;}});
            work.execute(()->{
                try{vault().clearOwner(owner);call.resolve();}
                catch(Exception e){call.reject(e.getMessage());}
            });
        }catch(Exception e){call.reject(e.getMessage());}
    }
    @Override protected void handleOnDestroy(){
        if(player!=null){player.dismiss();player=null;}
        activeOwner=null;
        work.shutdownNow();
        super.handleOnDestroy();
    }
}
