package com.trainingskompas.app.export;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.net.Uri;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * TK-REL-SEC-33 — instrumentatietest op een emulator (synthetische gegevens): de echte ContentResolver-route
 * (openFileDescriptor "wt", FileDescriptor.sync, openInputStream) schrijft, synchroniseert en leest terug.
 * Het SAF-keuzescherm zelf wordt op een fysiek toestel getest (zie het testprotocol).
 */
@RunWith(AndroidJUnit4.class)
public class ContentBestemmingInstrumentedTest {

    private static String envelop(int n) {
        StringBuilder b = new StringBuilder(TkExportSessie.ENVELOP_BEGIN + "\"data\":\"");
        while (b.length() < n - 2) b.append((char) ('A' + (b.length() % 26)));
        return b.append("\"}").toString();
    }

    private static String sha(String s) throws Exception {
        return TkExportSessie.hex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.US_ASCII)));
    }

    @Test
    public void schrijftSynchroniseertEnLeestTerug() throws Exception {
        Context ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File f = new File(ctx.getCacheDir(), "proef.tkbackup");
        f.delete();
        String t = envelop(2 * 1024 * 1024 + 17);
        TkExportSessie s = new TkExportSessie(new ContentBestemming(ctx.getContentResolver(), Uri.fromFile(f)), t.length(), sha(t));
        int index = 0;
        for (int i = 0; i < t.length(); i += TkExportSessie.MAX_DEEL) {
            assertEquals(TkExportSessie.DEEL_OK, s.schrijfDeel(index++, t.substring(i, Math.min(t.length(), i + TkExportSessie.MAX_DEEL))).status);
        }
        TkExportSessie.Resultaat r = s.voltooi();
        assertEquals(TkExportSessie.VERIFIED_READBACK, r.status);
        assertEquals(t.length(), f.length());
        assertEquals(sha(t), r.sha256);
        f.delete();
    }

    @Test
    public void verwijdertBijAfwijkendeInhoud() throws Exception {
        Context ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File f = new File(ctx.getCacheDir(), "afwijkend.tkbackup");
        f.delete();
        String t = envelop(4096);
        String ander = t.substring(0, 4000) + t.substring(4000).replace('A', 'B');
        TkExportSessie s = new TkExportSessie(new ContentBestemming(ctx.getContentResolver(), Uri.fromFile(f)), t.length(), sha(t));
        assertEquals(TkExportSessie.DEEL_OK, s.schrijfDeel(0, ander).status);
        TkExportSessie.Resultaat r = s.voltooi();
        assertEquals(TkExportSessie.MISMATCH, r.status);
        assertTrue(r.verwijderd);
        assertFalse(f.exists());
    }
}
