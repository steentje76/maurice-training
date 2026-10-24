package com.trainingskompas.app.export;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** TK-REL-SEC-33 — native unit tests van de exportkern (JUnit 4, zonder Android). */
public class TkExportSessieTest {

    /** Nep-bestemming met foutinjectie. */
    static final class Nep implements TkExportSessie.Bestemming {
        final ByteArrayOutputStream opslag = new ByteArrayOutputStream();
        boolean openFout, schrijfFout, volFout, syncFout, leesFout, leesAnders, leesLanger, verwijderd, verwijderLukt = true;
        int schrijfAanroepen;

        @Override public OutputStream openSchrijven() throws IOException {
            if (openFout) throw new IOException("openen");
            opslag.reset();
            return new OutputStream() {
                @Override public void write(int b) throws IOException { write(new byte[] { (byte) b }, 0, 1); }
                @Override public void write(byte[] b, int o, int l) throws IOException {
                    schrijfAanroepen++;
                    if (volFout) throw new IOException("write failed: ENOSPC (No space left on device)");
                    if (schrijfFout) throw new IOException("EIO");
                    opslag.write(b, o, l);
                }
            };
        }
        @Override public void synchroniseer(OutputStream uit) throws IOException { if (syncFout) throw new IOException("sync"); }
        @Override public InputStream openLezen() throws IOException {
            if (leesFout) throw new IOException("lezen");
            byte[] b = opslag.toByteArray();
            if (leesAnders && b.length > 0) { b = b.clone(); b[b.length / 2] ^= 1; }
            if (leesLanger) { byte[] c = new byte[b.length + 1]; System.arraycopy(b, 0, c, 0, b.length); c[b.length] = 'x'; b = c; }
            return new ByteArrayInputStream(b);
        }
        @Override public boolean verwijder() { verwijderd = true; return verwijderLukt; }
    }

    static String sha(String s) throws Exception {
        MessageDigest d = MessageDigest.getInstance("SHA-256");
        return TkExportSessie.hex(d.digest(s.getBytes(StandardCharsets.US_ASCII)));
    }

    static String envelop(int lengte) {
        StringBuilder b = new StringBuilder(TkExportSessie.ENVELOP_BEGIN + "\"data\":\"");
        while (b.length() < lengte - 2) b.append((char) ('A' + (b.length() % 26)));
        return b.append("\"}").toString();
    }

    static TkExportSessie.Resultaat schrijfAlles(TkExportSessie s, String tekst, int deel) {
        int index = 0;
        for (int i = 0; i < tekst.length(); i += deel) {
            TkExportSessie.Resultaat r = s.schrijfDeel(index++, tekst.substring(i, Math.min(tekst.length(), i + deel)));
            if (!TkExportSessie.DEEL_OK.equals(r.status)) return r;
        }
        return s.voltooi();
    }

    @Test public void geslaagd() throws Exception {
        String t = envelop(300000); Nep n = new Nep();
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 65536);
        assertEquals(TkExportSessie.VERIFIED_READBACK, r.status);
        assertEquals(t.length(), r.grootte);
        assertEquals(sha(t), r.sha256);
        assertFalse(n.verwijderd);
        assertEquals(t, new String(n.opslag.toByteArray(), StandardCharsets.US_ASCII));
    }

    @Test public void schrijvenMislukt() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.schrijfFout = true;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.WRITE_FAILED, r.status);
        assertEquals("schrijven", r.reden);
        assertTrue(n.verwijderd && r.verwijderd);
    }

    @Test public void opslagVol() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.volFout = true;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.WRITE_FAILED, r.status);
        assertEquals("opslag_vol", r.reden);
    }

    @Test public void openenMislukt() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.openFout = true;
        assertEquals(TkExportSessie.WRITE_FAILED, schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100).status);
    }

    @Test public void sluitenMislukt() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.syncFout = true;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.WRITE_FAILED, r.status);
        assertEquals("sluiten", r.reden);
        assertTrue(n.verwijderd);
    }

    @Test public void teruglezenMislukt() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.leesFout = true;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.READ_FAILED, r.status);
        assertTrue(n.verwijderd);
        assertNull(r.sha256);
    }

    @Test public void teruggelezenInhoudWijktAf() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.leesAnders = true;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.MISMATCH, r.status);
        assertTrue(n.verwijderd);
    }

    @Test public void teruggelezenLanger() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.leesLanger = true;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.MISMATCH, r.status);
        // Begrensd teruglezen: stoppen zodra er meer binnenkomt dan geschreven is (geen onbegrensd lezen).
        assertEquals("groter_dan_geschreven", r.reden);
    }

    @Test public void andereInhoudDanOpgegeven() throws Exception {
        String t = envelop(1000), ander = envelop(999) + "B"; Nep n = new Nep();
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), ander, 100);
        assertEquals(TkExportSessie.MISMATCH, r.status);
        assertTrue(n.verwijderd);
    }

    @Test public void onvolledigVoltooien() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); TkExportSessie s = new TkExportSessie(n, t.length(), sha(t));
        assertEquals(TkExportSessie.DEEL_OK, s.schrijfDeel(0, t.substring(0, 500)).status);
        TkExportSessie.Resultaat r = s.voltooi();
        assertEquals(TkExportSessie.WRITE_FAILED, r.status);
        assertEquals("onvolledig", r.reden);
        assertTrue(n.verwijderd);
    }

    @Test public void volgordeEnGrenzen() throws Exception {
        String t = envelop(2000); Nep n = new Nep();
        TkExportSessie s = new TkExportSessie(n, t.length(), sha(t));
        assertEquals(TkExportSessie.WRITE_FAILED, s.schrijfDeel(1, "abc").status); // verkeerde volgorde
        Nep n2 = new Nep(); TkExportSessie s2 = new TkExportSessie(n2, t.length(), sha(t));
        StringBuilder groot = new StringBuilder(); while (groot.length() <= TkExportSessie.MAX_DEEL) groot.append('A');
        assertEquals("deelgrootte", s2.schrijfDeel(0, groot.toString()).reden);
        Nep n3 = new Nep(); TkExportSessie s3 = new TkExportSessie(n3, 10, sha("0123456789"));
        assertEquals("groter_dan_opgegeven", s3.schrijfDeel(0, "01234567890").reden);
        try { new TkExportSessie(new Nep(), TkExportSessie.MAX_TOTAAL + 1, sha("x")); throw new AssertionError("te groot geaccepteerd"); } catch (IllegalArgumentException verwacht) { }
        try { new TkExportSessie(new Nep(), 10, "GEEN-HEX"); throw new AssertionError("ongeldige sha geaccepteerd"); } catch (IllegalArgumentException verwacht) { }
    }

    @Test public void geenOnversleuteldeTekst() throws Exception {
        String t = TkExportSessie.ENVELOP_BEGIN + "\"naam\":\"Krachttraining é\"}"; Nep n = new Nep();
        TkExportSessie.Resultaat r = new TkExportSessie(n, t.length(), sha("x")).schrijfDeel(0, t);
        assertEquals("geen_versleutelde_envelop", r.reden);
        assertEquals(0, n.opslag.size());
    }

    @Test public void onversleuteldeAsciiJsonGeweigerd() throws Exception {
        String t = "{\"format\":\"tk-local-rescue-data.v1\",\"entries\":[]}"; Nep n = new Nep();
        TkExportSessie.Resultaat r = new TkExportSessie(n, t.length(), sha(t)).schrijfDeel(0, t);
        assertEquals("geen_versleutelde_envelop", r.reden);
        assertEquals(0, n.opslag.size());
    }

    @Test public void afbrekenNaSucces() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); TkExportSessie s = new TkExportSessie(n, t.length(), sha(t));
        assertEquals(TkExportSessie.VERIFIED_READBACK, schrijfAlles(s, t, 100).status);
        TkExportSessie.Resultaat r = s.breekAf(TkExportSessie.ACCOUNT_CHANGED);
        assertEquals(TkExportSessie.ACCOUNT_CHANGED, r.status);
        assertTrue(n.verwijderd);
    }

    @Test public void verwijderenMisluktWordtGemeld() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); n.leesFout = true; n.verwijderLukt = false;
        TkExportSessie.Resultaat r = schrijfAlles(new TkExportSessie(n, t.length(), sha(t)), t, 100);
        assertEquals(TkExportSessie.READ_FAILED, r.status);
        assertFalse(r.verwijderd);
    }

    @Test public void naFoutGeenVerdereDelen() throws Exception {
        String t = envelop(1000); Nep n = new Nep(); TkExportSessie s = new TkExportSessie(n, t.length(), sha(t));
        assertEquals(TkExportSessie.WRITE_FAILED, s.schrijfDeel(5, "A").status);
        assertEquals("sessie_gesloten", s.schrijfDeel(0, "A").reden);
        assertEquals("sessie_gesloten", s.voltooi().reden);
    }
}
