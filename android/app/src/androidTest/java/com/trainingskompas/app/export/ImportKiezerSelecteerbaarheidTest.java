package com.trainingskompas.app.export;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;

import com.trainingskompas.app.TkBestandOpslaanPlugin;

import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * TK-REL-SEC-34 — selecteerbaarheid in de echte Android-bestandskiezer (DocumentsUI), emulator met synthetische gegevens.
 * Reproduceert het defect uit de fysieke test (Android 11): een als application/octet-stream opgeslagen .tkbackup is
 * uitgeschakeld in een kiezer die alleen application/json toelaat. De kiezer wordt opgebouwd zoals Capacitor 6 dat doet
 * (BridgeWebChromeClient.getValidTypes met de echte MimeTypeMap), uit de accept-lijst in de verpakte index.html.
 */
@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = 29)
public class ImportKiezerSelecteerbaarheidTest {
    private static final long WACHT = 10000;
    private final List<Uri> aangemaakt = new ArrayList<>();

    private static Context ctx() { return InstrumentationRegistry.getInstrumentation().getTargetContext(); }
    private static UiDevice apparaat() { return UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()); }

    /** accept-attribuut van een bestandsinvoer uit de verpakte app (assets/public/index.html). */
    static String acceptUitApp(String id) throws Exception {
        try (InputStream in = ctx().getAssets().open("public/index.html")) {
            ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[65536]; int n;
            while ((n = in.read(buf)) != -1) b.write(buf, 0, n);
            Matcher m = Pattern.compile("<input id=\"" + Pattern.quote(id) + "\"[^>]*accept=\"([^\"]*)\"").matcher(new String(b.toByteArray(), StandardCharsets.UTF_8));
            assertTrue("accept van " + id + " niet gevonden", m.find());
            return m.group(1);
        }
    }

    /** Zelfde vertaling als Capacitor 6 BridgeWebChromeClient.getValidTypes(), met de echte MimeTypeMap. */
    static String[] geldigeTypes(String accept) {
        List<String> uit = new ArrayList<>();
        MimeTypeMap mtm = MimeTypeMap.getSingleton();
        for (String t : accept.split(",")) {
            String s = t.trim().toLowerCase();
            if (s.startsWith(".")) { String m = mtm.getMimeTypeFromExtension(s.substring(1)); if (m != null && !uit.contains(m)) uit.add(m); }
            else if (!s.isEmpty() && !uit.contains(s)) uit.add(s);
        }
        return uit.toArray(new String[0]);
    }

    private Uri maakDownload(String naam) throws Exception {
        ContentResolver cr = ctx().getContentResolver();
        ContentValues v = new ContentValues();
        v.put(MediaStore.MediaColumns.DISPLAY_NAME, naam);
        v.put(MediaStore.MediaColumns.MIME_TYPE, TkBestandOpslaanPlugin.EXPORT_MIME);
        v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        v.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        assertNotNull(u);
        aangemaakt.add(u);
        try (OutputStream o = cr.openOutputStream(u)) {
            o.write((TkExportSessie.ENVELOP_BEGIN + "\"data\":\"QUJD\"}").getBytes(StandardCharsets.US_ASCII));
        }
        ContentValues klaar = new ContentValues();
        klaar.put(MediaStore.MediaColumns.IS_PENDING, 0);
        cr.update(u, klaar, null, null);
        return u;
    }

    enum Stand { SELECTEERBAAR, UITGESCHAKELD, VERBORGEN }

    /**
     * Opent de kiezer zoals de WebView/Capacitor hem opent en bepaalt de stand van het bestand in de map Downloads.
     * Afhankelijk van de DocumentsUI-versie wordt een niet-passend bestand uitgeschakeld (Android 11, fysiek bewezen)
     * of niet getoond; beide betekenen: niet selecteerbaar.
     */
    private Stand stand(String[] types, String naam) {
        UiDevice d = apparaat();
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(types[0]);
        i.putExtra(Intent.EXTRA_MIME_TYPES, types);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        ctx().startActivity(i);
        UiObject2 item = d.wait(Until.findObject(By.text(naam)), 4000);
        if (item == null) {
            UiObject2 menu = d.wait(Until.findObject(By.desc("Show roots")), WACHT);
            if (menu != null) menu.click();
            UiObject2 dl = d.wait(Until.findObject(By.text("Downloads")), WACHT);
            assertNotNull("root Downloads niet gevonden", dl);
            dl.click();
            item = d.wait(Until.findObject(By.text(naam)), WACHT);
        }
        if (item == null) { d.pressBack(); d.pressBack(); return Stand.VERBORGEN; }
        boolean aan = true;
        UiObject2 o = item;
        for (int n = 0; n < 5 && o != null; n++) { if (!o.isEnabled()) aan = false; o = o.getParent(); }
        d.pressBack();
        d.pressBack();
        return aan ? Stand.SELECTEERBAAR : Stand.UITGESCHAKELD;
    }

    @Test
    public void oudeAcceptLijstSchakeltExportUit() throws Exception {
        String naam = "tkproef-oud-" + System.currentTimeMillis() + ".tkbackup";
        maakDownload(naam);
        String[] types = geldigeTypes(".tkbackup,application/json");
        assertEquals(1, types.length);
        assertEquals("application/json", types[0]);
        Stand s = stand(types, naam);
        assertTrue("reproductie van het defect: met alleen application/json hoort het bestand niet selecteerbaar te zijn, stand=" + s, s != Stand.SELECTEERBAAR);
    }

    @Test
    public void appAcceptLijstMaaktExportSelecteerbaar() throws Exception {
        String naam = "tkproef-nieuw-" + System.currentTimeMillis() + ".tkbackup";
        maakDownload(naam);
        String[] types = geldigeTypes(acceptUitApp("tk-restore-file"));
        assertTrue(java.util.Arrays.asList(types).contains(TkBestandOpslaanPlugin.EXPORT_MIME));
        assertEquals("herstelpreview: native export moet selecteerbaar zijn", Stand.SELECTEERBAAR, stand(types, naam));
        String[] check = geldigeTypes(acceptUitApp("tk-backup-file"));
        assertTrue(java.util.Arrays.asList(check).contains(TkBestandOpslaanPlugin.EXPORT_MIME));
    }

    @After
    public void opruimen() {
        for (Uri u : aangemaakt) { try { ctx().getContentResolver().delete(u, null, null); } catch (Exception ignored) { } }
        aangemaakt.clear();
    }
}
