package com.trainingskompas.app;

import android.content.Context;
import android.os.Build;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.*;
import java.util.Arrays;
import static org.junit.Assert.*;

/** Real Android Keystore + encrypted chunk / random-access integrity test.
 * Uses synthetic bytes only — never the licensed MoveKit source binaries.
 */
@RunWith(AndroidJUnit4.class)
public class TkMediaVaultInstrumentedTest {
    private static final String A="12345678-1234-4234-8234-123456789abc";
    private static final String B="12345678-1234-4234-8234-123456789def";

    @Test public void encryptedStorageSeekTamperAndLogout()throws Exception {
        Assume.assumeTrue(Build.VERSION.SDK_INT>=23);
        Context ctx=InstrumentationRegistry.getInstrumentation().getTargetContext();
        TkMediaVault vault=new TkMediaVault(ctx);
        byte[] plain=new byte[TkMediaVault.CHUNK_SIZE*2+321];
        for(int i=0;i<plain.length;i++)plain[i]=(byte)(i*71+13);
        TkMediaIntegrity.Entry e=new TkMediaIntegrity.Entry("TK-999997","v2","synthetic-test",
            TkMediaVault.digest(plain),plain.length);
        vault.clearOwner(A);vault.clearOwner(B);
        try{
            assertFalse(vault.has(A,e));
            assertEquals((long)plain.length,vault.store(A,e,new ByteArrayInputStream(plain)));
            assertTrue(vault.has(A,e));assertFalse(vault.has(B,e));
            assertEquals(0L,vault.store(A,e,new ByteArrayInputStream(plain)));
            File root=new File(ctx.getNoBackupFilesDir(),"tk-movekit-secure-v1");
            assertEquals(0,countPlainMp4(root));
            assertTrue(vault.usedBytes(A)>plain.length);
            try(TkMediaDataSource r=new TkMediaDataSource(vault,A,e)){
                assertEquals(plain.length,r.getSize());
                byte[] buff=new byte[400];
                long start=TkMediaVault.CHUNK_SIZE-170;
                assertEquals(400,r.readAt(start,buff,0,buff.length));
                assertArrayEquals(Arrays.copyOfRange(plain,(int)start,(int)start+400),buff);
                assertEquals(-1,r.readAt(plain.length,buff,0,1));
                assertEquals(1,r.readAt(plain.length-1,buff,0,1));
                assertEquals(plain[plain.length-1],buff[0]);
            }
            File chunk=findFile(root,"000000.gcm");
            assertNotNull(chunk);
            try(RandomAccessFile f=new RandomAccessFile(chunk,"rw")){
                f.seek(22);int x=f.read();f.seek(22);f.write(x^1);
            }
            try(TkMediaDataSource r=new TkMediaDataSource(vault,A,e)){
                try{r.readAt(0,new byte[16],0,16);fail("GCM corruption must be rejected");}
                catch(IOException expected){assertTrue(expected.getMessage().contains("DECRYPT"));}
            }
        }finally{vault.clearOwner(A);vault.clearOwner(B);}
        assertFalse(vault.has(A,e));
    }
    private static int countPlainMp4(File f){
        if(f.isFile())return f.getName().endsWith(".mp4")?1:0;
        int sum=0;File[] files=f.listFiles();
        if(files!=null)for(File item:files)sum+=countPlainMp4(item);
        return sum;
    }
    private static File findFile(File f,String name){
        if(f.isFile())return f.getName().equals(name)?f:null;
        File[] files=f.listFiles();
        if(files!=null)for(File item:files){File v=findFile(item,name);if(v!=null)return v;}
        return null;
    }
}