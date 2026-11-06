package com.trainingskompas.app;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Versioned SHA-256 allowlist embedded in APK. Contains no video/poster bytes. */
final class TkMediaIntegrity {
    static final class Entry {
        final String catalogId, version, slug, sha256;
        final long bytes;
        Entry(String id, String ver, String slug, String sha, long n) {
            this.catalogId=id; this.version=ver; this.slug=slug; this.sha256=sha; this.bytes=n;
        }
        String storagePath() { return "movekit/"+version+"/video/"+slug+".mp4"; }
    }
    private final Map<String,Entry> entries = new HashMap<>();
    TkMediaIntegrity(Context ctx) throws Exception {
        try (InputStream is=ctx.getAssets().open("tk-movekit-integrity.json");
             ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buf=new byte[8192]; int n;
            while((n=is.read(buf))!=-1)out.write(buf,0,n);
            JSONObject data=new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
            if(!"tk-secure-media-integrity/1".equals(data.optString("schema")))throw new SecurityException("MEDIA_REGISTRY_SCHEMA");
            JSONArray arr=data.getJSONArray("items");
            if(arr.length()!=808)throw new SecurityException("MEDIA_REGISTRY_COUNT");
            for(int i=0;i<arr.length();i++){
                JSONObject o=arr.getJSONObject(i);
                String id=o.getString("catalogId"),version=o.getString("version");
                String slug=o.getString("slug"),sha=o.getString("sha256");
                long bytes=o.getLong("bytes");
                if(!id.matches("TK-[0-9]{6}")||!(version.equals("v1")||version.equals("v2"))
                   ||!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")||!sha.matches("[a-f0-9]{64}")
                   ||bytes<=0||bytes>33554432)throw new SecurityException("MEDIA_REGISTRY_INVALID");
                String key=id+":"+version;
                if(entries.put(key,new Entry(id,version,slug,sha,bytes))!=null)
                    throw new SecurityException("MEDIA_REGISTRY_DUPLICATE");
            }
        }
    }
    Entry find(String id,String version) {
        Entry e=entries.get(id+":"+version);
        if(e==null)throw new SecurityException("MEDIA_NOT_IN_SIGNED_REGISTRY");
        return e;
    }
}
