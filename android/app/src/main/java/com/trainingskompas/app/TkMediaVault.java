package com.trainingskompas.app;

import android.content.Context;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/**
 * App-private, account-separated AES-256-GCM chunked MoveKit cache.
 * All plaintext exists exclusively in RAM. Ciphertext & per-video metadata reside
 * under noBackupFilesDir(). There is no FileProvider URI or MP4 export endpoint.
 * Android API >=23 required for AndroidKeyStore AES/GCM and MediaDataSource.
 */
final class TkMediaVault {
    static final int CHUNK_SIZE=256*1024;
    static final int IV_SIZE=12;
    static final int TAG_SIZE=16;
    static final long QUOTA=250L*1024L*1024L;
    private final Context context;
    private final File root;
    private final SecureRandom random=new SecureRandom();
    static final class Meta {
        final long bytes;
        final int chunks;
        final String sha256;
        Meta(long bytes,int chunks,String sha256){this.bytes=bytes;this.chunks=chunks;this.sha256=sha256;}
    }

    TkMediaVault(Context context) {
        if(Build.VERSION.SDK_INT<23)throw new IllegalStateException("ANDROID_23_REQUIRED");
        this.context=context.getApplicationContext();
        root=new File(context.getNoBackupFilesDir(),"tk-movekit-secure-v1");
        if(!root.exists()&&!root.mkdirs())throw new IllegalStateException("MEDIA_VAULT_CREATE_FAILED");
    }
    static String checkOwner(String owner){
        if(owner==null||!owner.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}"))
            throw new SecurityException("INVALID_MEDIA_OWNER");
        return owner.toLowerCase(Locale.ROOT);
    }
    static String hex(byte[] bytes){
        char[] symbols="0123456789abcdef".toCharArray(),out=new char[bytes.length*2];
        for(int i=0;i<bytes.length;i++){int b=bytes[i]&255;out[2*i]=symbols[b>>>4];out[2*i+1]=symbols[b&15];}
        return new String(out);
    }
    static String digest(byte[] bytes)throws Exception{
        return hex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
    private static String hashOwner(String owner)throws Exception{
        return digest(checkOwner(owner).getBytes(StandardCharsets.UTF_8)).substring(0,32);
    }
    private File ownerDir(String owner)throws Exception{return new File(root,hashOwner(owner));}
    private File mediaDir(String owner,TkMediaIntegrity.Entry entry)throws Exception{
        return new File(ownerDir(owner),entry.catalogId+"-"+entry.version);
    }
    private String alias(String owner)throws Exception{return "tk-movekit-aes-gcm-"+hashOwner(owner);}
    private SecretKey getKey(String owner,boolean create)throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        String name=alias(owner);
        if(ks.containsAlias(name))return ((KeyStore.SecretKeyEntry)ks.getEntry(name,null)).getSecretKey();
        if(!create)throw new SecurityException("OFFLINE_KEY_MISSING");
        KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        gen.init(new KeyGenParameterSpec.Builder(name,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return gen.generateKey();
    }
    private static byte[] aad(String owner,TkMediaIntegrity.Entry entry,int index){
        return (checkOwner(owner)+"|"+entry.catalogId+"|"+entry.version+"|"+index)
             .getBytes(StandardCharsets.UTF_8);
    }
    private static File part(File dir,int index){
        return new File(dir,String.format(Locale.ROOT,"%06d.gcm",index));
    }
    private void encryptChunk(File destination,SecretKey key,byte[] bytes,int length,
                              String owner,TkMediaIntegrity.Entry entry,int index)throws Exception{
        byte[] iv=new byte[IV_SIZE];random.nextBytes(iv);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,iv));
        cipher.updateAAD(aad(owner,entry,index));
        byte[] encrypted=cipher.doFinal(bytes,0,length);
        try(FileOutputStream out=new FileOutputStream(destination)){
            out.write(iv);out.write(encrypted);out.getFD().sync();
        }finally{Arrays.fill(encrypted,(byte)0);}
    }
    static void deleteTree(File path){
        if(path==null||!path.exists())return;
        if(path.isDirectory()){
            File[] children=path.listFiles();
            if(children!=null)for(File child:children)deleteTree(child);
        }
        if(!path.delete())throw new IllegalStateException("MEDIA_DELETE_FAILED");
    }
    private static void writeJson(File file,JSONObject json)throws Exception{
        try(FileOutputStream out=new FileOutputStream(file)){
            out.write(json.toString().getBytes(StandardCharsets.UTF_8));out.getFD().sync();
        }
    }
    private Meta meta(String owner,TkMediaIntegrity.Entry entry)throws Exception{
        File dir=mediaDir(owner,entry),file=new File(dir,"manifest.json");
        if(!file.isFile())throw new FileNotFoundException("VIDEO_NOT_CACHED");
        byte[] data;
        try(FileInputStream in=new FileInputStream(file);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buf=new byte[2048];int n;
            while((n=in.read(buf))!=-1){out.write(buf,0,n);if(out.size()>4096)throw new SecurityException("MEDIA_META_TOO_LARGE");}
            data=out.toByteArray();
        }
        JSONObject m=new JSONObject(new String(data,StandardCharsets.UTF_8));
        int chunks=m.getInt("chunks");
        long bytes=m.getLong("bytes");
        if(!"tk-offline-media/1".equals(m.optString("schema"))
           ||!hashOwner(owner).equals(m.optString("ownerHash"))
           ||!entry.catalogId.equals(m.optString("catalogId"))
           ||!entry.version.equals(m.optString("version"))
           ||!entry.sha256.equals(m.optString("sha256"))
           ||bytes!=entry.bytes||chunks!=(bytes+CHUNK_SIZE-1)/CHUNK_SIZE
           ||chunks<=0)throw new SecurityException("MEDIA_META_INVALID");
        return new Meta(bytes,chunks,m.getString("sha256"));
    }
    boolean has(String owner,TkMediaIntegrity.Entry entry){
        try{meta(owner,entry);getKey(owner,false);return true;}catch(Exception e){return false;}
    }
    long usedBytes(String owner)throws Exception {
        File dir=ownerDir(owner);if(!dir.isDirectory())return 0;
        long total=0;
        File[] files=dir.listFiles();
        if(files==null)return 0;
        for(File m:files){
            if(!m.isDirectory()||m.getName().contains(".partial")||m.getName().contains(".backup"))continue;
            File[] parts=m.listFiles();
            if(parts!=null)for(File p:parts)if(p.isFile())total+=p.length();
        }
        return total;
    }
    /** Downloaded InputStream may be HTTPS; caller must enforce signed URL and Wi-Fi rules. */
    synchronized long store(String owner,TkMediaIntegrity.Entry entry,InputStream stream)throws Exception{
        owner=checkOwner(owner);
        if(stream==null)throw new IllegalArgumentException("EMPTY_MEDIA_STREAM");
        if(has(owner,entry))return 0;
        if(usedBytes(owner)+entry.bytes+(entry.bytes/CHUNK_SIZE+1)*28>QUOTA)
            throw new IllegalStateException("OFFLINE_QUOTA_EXCEEDED");
        File dir=ownerDir(owner);
        if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("OWNER_MEDIA_DIR_FAILED");
        File stage=new File(dir,entry.catalogId+"-"+entry.version+".partial-"+UUID.randomUUID());
        if(!stage.mkdir())throw new IOException("MEDIA_STAGING_FAILED");
        byte[] buf=new byte[CHUNK_SIZE];long bytes=0;int count=0;
        MessageDigest md=MessageDigest.getInstance("SHA-256");
        File target=mediaDir(owner,entry);
        File backup=new File(dir,entry.catalogId+"-"+entry.version+".backup-"+UUID.randomUUID());
        try{
            SecretKey key=getKey(owner,true);
            for(;;){
                int filled=0,n;
                int emptyReads=0;
                while(filled<buf.length&&(n=stream.read(buf,filled,buf.length-filled))!=-1){
                    if(n==0){if(++emptyReads>3)throw new IOException("MEDIA_STREAM_STALLED");continue;}
                    emptyReads=0;
                    filled+=n;
                }
                if(filled==0)break;
                bytes+=filled;
                if(bytes>entry.bytes)throw new SecurityException("MEDIA_LENGTH_EXCEEDED");
                md.update(buf,0,filled);
                encryptChunk(part(stage,count),key,buf,filled,owner,entry,count);
                count++;
            }
            if(bytes!=entry.bytes||!hex(md.digest()).equals(entry.sha256))
                throw new SecurityException("MEDIA_INTEGRITY_FAILED");
            JSONObject manifest=new JSONObject();
            manifest.put("schema","tk-offline-media/1");
            manifest.put("ownerHash",hashOwner(owner));
            manifest.put("catalogId",entry.catalogId);
            manifest.put("version",entry.version);
            manifest.put("sha256",entry.sha256);
            manifest.put("bytes",bytes);
            manifest.put("chunks",count);
            writeJson(new File(stage,"manifest.json"),manifest);
            if(target.exists()&&!target.renameTo(backup))throw new IOException("MEDIA_BACKUP_FAILED");
            if(!stage.renameTo(target)){
                if(backup.exists()&&!backup.renameTo(target))throw new IOException("MEDIA_RESTORE_FAILED");
                throw new IOException("MEDIA_FINALIZE_FAILED");
            }
            if(backup.exists())deleteTree(backup);
            return bytes;
        }finally{
            Arrays.fill(buf,(byte)0);
            if(stage.exists())deleteTree(stage);
        }
    }
    synchronized byte[] readChunk(String owner,TkMediaIntegrity.Entry entry,int index)throws Exception{
        Meta m=meta(owner,entry);
        if(index<0||index>=m.chunks)throw new IndexOutOfBoundsException();
        int length=(int)Math.min(CHUNK_SIZE,m.bytes-(long)index*CHUNK_SIZE);
        File file=part(mediaDir(owner,entry),index);
        if(!file.isFile()||file.length()!=IV_SIZE+length+TAG_SIZE)
            throw new SecurityException("MEDIA_CIPHERTEXT_INVALID");
        byte[] iv=new byte[IV_SIZE],encrypted=new byte[length+TAG_SIZE];
        try(FileInputStream in=new FileInputStream(file)){
            int ivDone=0;while(ivDone<IV_SIZE){int n=in.read(iv,ivDone,IV_SIZE-ivDone);if(n<0)throw new IOException("MEDIA_IV_INCOMPLETE");ivDone+=n;}
            int done=0;while(done<encrypted.length){int n=in.read(encrypted,done,encrypted.length-done);if(n<0)throw new IOException("MEDIA_CIPHERTEXT_INCOMPLETE");done+=n;}
        }
        try{
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,getKey(owner,false),new GCMParameterSpec(128,iv));
            cipher.updateAAD(aad(owner,entry,index));
            byte[] plain=cipher.doFinal(encrypted);
            if(plain.length!=length)throw new SecurityException("MEDIA_DECRYPT_LENGTH");
            return plain;
        }finally{Arrays.fill(encrypted,(byte)0);Arrays.fill(iv,(byte)0);}
    }
    synchronized long length(String owner,TkMediaIntegrity.Entry e)throws Exception{return meta(owner,e).bytes;}
    synchronized void remove(String owner,TkMediaIntegrity.Entry e)throws Exception{
        File dir=mediaDir(owner,e);if(dir.exists())deleteTree(dir);
    }
    synchronized void clearOwner(String owner)throws Exception{
        owner=checkOwner(owner);
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        String name=alias(owner);
        // Revoke key FIRST. Even if a delete fails, remaining ciphertext is unusable.
        if(ks.containsAlias(name))ks.deleteEntry(name);
        File dir=ownerDir(owner);if(dir.exists())deleteTree(dir);
    }
}
