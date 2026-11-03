package com.trainingskompas.app;

import android.media.MediaDataSource;
import android.os.Build;
import androidx.annotation.RequiresApi;
import java.io.IOException;
import java.util.Arrays;

/**
 * Seekable in-memory decrypted MP4 reader for Android MediaPlayer.
 * NEVER creates an unencrypted temporary file, FileProvider URI, HTTP endpoint,
 * exported content provider, web resource, JS data URI or DownloadManager entry.
 */
@RequiresApi(api=Build.VERSION_CODES.M)
final class TkMediaDataSource extends MediaDataSource {
    private final TkMediaVault vault;
    private final TkMediaIntegrity.Entry entry;
    private final String owner;
    private final long bytes;
    private byte[] plaintext;
    private int currentChunk=-1;
    private boolean closed=false;

    TkMediaDataSource(TkMediaVault vault,String owner,TkMediaIntegrity.Entry entry)throws Exception {
        this.vault=vault;this.owner=TkMediaVault.checkOwner(owner);this.entry=entry;
        this.bytes=vault.length(this.owner,entry);
    }
    @Override public synchronized long getSize(){return bytes;}
    @Override public synchronized int readAt(long position,byte[] buffer,int offset,int size)throws IOException {
        if(closed)throw new IOException("OFFLINE_SOURCE_CLOSED");
        if(position<0||offset<0||size<0||offset>buffer.length-size)throw new IOException("OFFLINE_READ_INVALID");
        if(position>=bytes)return -1;
        int todo=(int)Math.min((long)size,bytes-position),written=0;
        while(written<todo){
            long where=position+written;
            int chunk=(int)(where/TkMediaVault.CHUNK_SIZE);
            int within=(int)(where%TkMediaVault.CHUNK_SIZE);
            try{
                if(chunk!=currentChunk){
                    if(plaintext!=null)Arrays.fill(plaintext,(byte)0);
                    plaintext=vault.readChunk(owner,entry,chunk);
                    currentChunk=chunk;
                }
            }catch(Exception e){throw new IOException("OFFLINE_DECRYPT_FAILED",e);}
            int n=Math.min(todo-written,plaintext.length-within);
            if(n<=0)throw new IOException("OFFLINE_CHUNK_INVALID");
            System.arraycopy(plaintext,within,buffer,offset+written,n);
            written+=n;
        }
        return written;
    }
    @Override public synchronized void close(){
        closed=true;
        if(plaintext!=null){Arrays.fill(plaintext,(byte)0);plaintext=null;}
        currentChunk=-1;
    }
}
