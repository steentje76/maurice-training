package com.trainingskompas.app.export;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * TK-REL-SEC-33 — kern van de native export (zonder Android-afhankelijkheden, zodat hij met gewone JUnit
 * getest kan worden). Schrijft een AL VERSLEUTELD .tkbackup-bestand in begrensde delen naar een bestemming,
 * sluit en synchroniseert, leest het daarna volledig terug en vergelijkt grootte en SHA-256 met wat de webkant
 * vooraf opgaf. Alleen dan is de uitkomst VERIFIED_READBACK.
 *
 * Veiligheidscontract:
 *  - geen wachtzin of onversleutelde gegevens: de kern ziet alleen ASCII-tekens van de versleutelde envelop;
 *  - begrensd: elk deel ≤ MAX_DEEL tekens, totaal ≤ verwachte grootte ≤ MAX_TOTAAL; delen strikt op volgorde;
 *  - een fout bij schrijven, sluiten, teruglezen of vergelijken is nooit een succes; bij een fout of afbreken
 *    wordt de bestemming verwijderd (best effort) en wordt gemeld of dat lukte;
 *  - geen logging en geen opslag van inhoud.
 */
public final class TkExportSessie {

    public static final String CANCELLED = "CANCELLED";
    public static final String WRITE_FAILED = "WRITE_FAILED";
    public static final String READ_FAILED = "READ_FAILED";
    public static final String MISMATCH = "MISMATCH";
    public static final String ACCOUNT_CHANGED = "ACCOUNT_CHANGED";
    public static final String VERIFIED_READBACK = "VERIFIED_READBACK";
    /** Tussenstatus na een geslaagd deel; nooit een eindstatus. */
    public static final String DEEL_OK = "DEEL_OK";

    public static final int MAX_DEEL = 512 * 1024;
    public static final long MAX_TOTAAL = 32L * 1024 * 1024;
    private static final int LEESBUFFER = 64 * 1024;
    /** Begin van JSON.stringify(TKLocalBackup.encrypt(...)): de envelop met alleen ciphertext. */
    public static final String ENVELOP_BEGIN = "{\"format\":\"tk-local-rescue-encrypted.v1\",";

    /** De bestemming (Android: ContentResolver + document-URI). */
    public interface Bestemming {
        OutputStream openSchrijven() throws IOException;
        /** Gegevens naar de opslag forceren (bijv. FileDescriptor.sync()); mag een IOException geven. */
        void synchroniseer(OutputStream uit) throws IOException;
        InputStream openLezen() throws IOException;
        /** Bestemming verwijderen; true als dat aantoonbaar lukte. */
        boolean verwijder();
    }

    public static final class Resultaat {
        public final String status;
        public final String reden;
        public final long grootte;
        public final String sha256;
        public final boolean verwijderd;

        Resultaat(String status, String reden, long grootte, String sha256, boolean verwijderd) {
            this.status = status; this.reden = reden; this.grootte = grootte; this.sha256 = sha256; this.verwijderd = verwijderd;
        }
        public boolean geslaagd() { return VERIFIED_READBACK.equals(status); }
    }

    private final Bestemming bestemming;
    private final long verwachteGrootte;
    private final String verwachteSha;
    private OutputStream uit;
    private MessageDigest schrijfDigest;
    private long geschreven;
    private int volgendeIndex;
    private boolean afgesloten;
    private boolean voltooid;

    public TkExportSessie(Bestemming bestemming, long verwachteGrootte, String verwachteSha256Hex) {
        if (bestemming == null) throw new IllegalArgumentException("bestemming");
        if (verwachteGrootte <= 0 || verwachteGrootte > MAX_TOTAAL) throw new IllegalArgumentException("grootte");
        if (verwachteSha256Hex == null || !verwachteSha256Hex.matches("[0-9a-f]{64}")) throw new IllegalArgumentException("sha256");
        this.bestemming = bestemming;
        this.verwachteGrootte = verwachteGrootte;
        this.verwachteSha = verwachteSha256Hex;
    }

    public static boolean geldigeInvoer(long grootte, String sha) {
        return grootte > 0 && grootte <= MAX_TOTAAL && sha != null && sha.matches("[0-9a-f]{64}");
    }

    private Resultaat mislukt(String status, String reden) {
        sluitStil();
        afgesloten = true;
        boolean weg = false;
        try { weg = bestemming.verwijder(); } catch (RuntimeException e) { weg = false; }
        return new Resultaat(status, reden, geschreven, null, weg);
    }

    private void sluitStil() {
        if (uit != null) { try { uit.close(); } catch (IOException ignored) { } uit = null; }
    }

    private static boolean schijfVol(IOException e) {
        String m = String.valueOf(e.getMessage());
        return m.contains("ENOSPC") || m.toLowerCase().contains("no space");
    }

    /** Eén deel (ASCII-tekst van de versleutelde envelop) op volgorde schrijven. */
    public synchronized Resultaat schrijfDeel(int index, String deel) {
        if (afgesloten || voltooid) return new Resultaat(WRITE_FAILED, "sessie_gesloten", geschreven, null, false);
        if (index != volgendeIndex) return mislukt(WRITE_FAILED, "volgorde");
        if (deel == null || deel.isEmpty() || deel.length() > MAX_DEEL) return mislukt(WRITE_FAILED, "deelgrootte");
        if (geschreven + deel.length() > verwachteGrootte) return mislukt(WRITE_FAILED, "groter_dan_opgegeven");
        // Alleen een versleutelde envelop: het eerste deel moet met de formaatmarker beginnen.
        if (index == 0 && !deel.startsWith(ENVELOP_BEGIN)) return mislukt(WRITE_FAILED, "geen_versleutelde_envelop");
        byte[] b = new byte[deel.length()];
        for (int i = 0; i < b.length; i++) {
            char c = deel.charAt(i);
            if (c > 0x7e || (c < 0x20 && c != '\n' && c != '\r' && c != '\t')) return mislukt(WRITE_FAILED, "geen_versleutelde_envelop");
            b[i] = (byte) c;
        }
        try {
            if (uit == null) {
                uit = bestemming.openSchrijven();
                if (uit == null) return mislukt(WRITE_FAILED, "openen");
                schrijfDigest = sha256();
            }
            uit.write(b);
            schrijfDigest.update(b);
            geschreven += b.length;
            volgendeIndex++;
            return new Resultaat(DEEL_OK, null, geschreven, null, false);
        } catch (IOException e) {
            return mislukt(WRITE_FAILED, schijfVol(e) ? "opslag_vol" : "schrijven");
        } catch (RuntimeException e) {
            return mislukt(WRITE_FAILED, "schrijven");
        }
    }

    /** Sluiten, synchroniseren, volledig teruglezen en vergelijken. */
    public synchronized Resultaat voltooi() {
        if (afgesloten || voltooid) return new Resultaat(WRITE_FAILED, "sessie_gesloten", geschreven, null, false);
        if (uit == null || geschreven != verwachteGrootte) return mislukt(WRITE_FAILED, "onvolledig");
        String geschrevenSha = hex(schrijfDigest.digest());
        if (!geschrevenSha.equals(verwachteSha)) return mislukt(MISMATCH, "geschreven_inhoud_wijkt_af");
        try {
            uit.flush();
            bestemming.synchroniseer(uit);
            uit.close();
            uit = null;
        } catch (IOException e) {
            return mislukt(WRITE_FAILED, schijfVol(e) ? "opslag_vol" : "sluiten");
        }
        long gelezen = 0;
        MessageDigest leesDigest = sha256();
        try (InputStream in = bestemming.openLezen()) {
            if (in == null) return mislukt(READ_FAILED, "openen");
            byte[] buf = new byte[LEESBUFFER];
            int n;
            while ((n = in.read(buf)) != -1) {
                gelezen += n;
                if (gelezen > verwachteGrootte) return mislukt(MISMATCH, "groter_dan_geschreven");
                leesDigest.update(buf, 0, n);
            }
        } catch (IOException e) {
            return mislukt(READ_FAILED, "teruglezen");
        } catch (RuntimeException e) {
            return mislukt(READ_FAILED, "teruglezen");
        }
        String leesSha = hex(leesDigest.digest());
        if (gelezen != verwachteGrootte || !leesSha.equals(verwachteSha)) return mislukt(MISMATCH, "teruggelezen_inhoud_wijkt_af");
        voltooid = true;
        return new Resultaat(VERIFIED_READBACK, null, gelezen, leesSha, false);
    }

    /** Afbreken (gebruiker, accountwissel, fout aan de webkant): sluiten en de bestemming verwijderen. */
    public synchronized Resultaat breekAf(String status) {
        String st = ACCOUNT_CHANGED.equals(status) ? ACCOUNT_CHANGED : (CANCELLED.equals(status) ? CANCELLED : WRITE_FAILED);
        return mislukt(st, "afgebroken");
    }

    private static MessageDigest sha256() {
        try { return MessageDigest.getInstance("SHA-256"); } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    static String hex(byte[] d) {
        StringBuilder s = new StringBuilder(d.length * 2);
        for (byte x : d) { s.append(Character.forDigit((x >> 4) & 0xf, 16)).append(Character.forDigit(x & 0xf, 16)); }
        return s.toString();
    }
}
