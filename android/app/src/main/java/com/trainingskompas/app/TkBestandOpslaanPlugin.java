package com.trainingskompas.app;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.trainingskompas.app.export.ContentBestemming;
import com.trainingskompas.app.export.TkExportSessie;

import java.util.UUID;

/**
 * TkBestandOpslaanPlugin — TK-REL-SEC-33, native Android-export van de versleutelde reddingskopie.
 *
 * Route: Storage Access Framework (Intent.ACTION_CREATE_DOCUMENT). De sporter kiest zelf de locatie; de app
 * vraagt GEEN algemene opslagrechten. Het bestand wordt in begrensde delen (≤ 512 KiB tekst per aanroep)
 * geschreven, gesloten en gesynchroniseerd, en daarna via de ContentResolver volledig teruggelezen en op grootte
 * en SHA-256 vergeleken (TkExportSessie). Alleen dan: VERIFIED_READBACK.
 *
 * Over de bridge gaat uitsluitend de AL VERSLEUTELDE envelop (ASCII). Geen wachtzin, geen onversleutelde
 * trainingsgegevens. Deze klasse logt niets en bewaart niets (geen SharedPreferences, geen bestanden van de app).
 * Een mislukte of afgebroken export verwijdert het aangemaakte document (best effort) en meldt of dat lukte.
 *
 * Methoden: start({naam, grootte, sha256}) → {status:'GEOPEND', sessie, naam} | {status:'CANCELLED'}
 *           schrijf({sessie, index, data}) → {status:'DEEL_OK', geschreven} | fout-eindstatus
 *           voltooi({sessie}) → {status:'VERIFIED_READBACK', grootte, sha256, naam} | fout-eindstatus
 *           afbreken({sessie, status}) → {status, verwijderd}
 */
@CapacitorPlugin(name = "TkBestandOpslaan")
public class TkBestandOpslaanPlugin extends Plugin {

    private static final String NAAM_PATROON = "[A-Za-z0-9._-]{1,96}\\.tkbackup";
    /**
     * TK-REL-SEC-34: MIME-contract. application/octet-stream houdt de naam "….tkbackup" intact (bij application/json
     * voegen DocumentsUI-providers ".json" toe als de extensie niet bij het type past). De importkiezer in de app
     * (accept=".tkbackup,application/octet-stream,application/json") moet dit type daarom expliciet toelaten; de
     * inhoud wordt bij het openen altijd volledig gecontroleerd (MIME of extensie keurt niets goed).
     */
    public static final String EXPORT_MIME = "application/octet-stream";

    private String sessieId;
    private TkExportSessie sessie;
    private Uri document;
    private String documentNaam;
    private ContentBestemming bestemming;
    private long startGrootte;
    private String startSha;

    @PluginMethod
    public void start(PluginCall call) {
        String naam = call.getString("naam");
        Double grootteD = call.getDouble("grootte");
        String sha = call.getString("sha256");
        long grootte = grootteD == null ? -1 : grootteD.longValue();
        if (naam == null || !naam.matches(NAAM_PATROON) || !TkExportSessie.geldigeInvoer(grootte, sha)) {
            resultaat(call, TkExportSessie.WRITE_FAILED, "ongeldige_invoer", false);
            return;
        }
        if (sessie != null) {
            // Een eerdere, niet afgeronde sessie wordt eerst afgebroken (inclusief verwijderen van het document).
            sluitSessie(TkExportSessie.WRITE_FAILED);
        }
        startGrootte = grootte;
        startSha = sha;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(EXPORT_MIME);
        intent.putExtra(Intent.EXTRA_TITLE, naam);
        startActivityForResult(call, intent, "naKeuze");
    }

    @ActivityCallback
    private void naKeuze(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject r = new JSObject();
            r.put("status", TkExportSessie.CANCELLED);
            call.resolve(r);
            return;
        }
        document = result.getData().getData();
        documentNaam = weergaveNaam(document);
        sessieId = UUID.randomUUID().toString();
        bestemming = new ContentBestemming(getContext().getContentResolver(), document);
        sessie = new TkExportSessie(bestemming, startGrootte, startSha);
        JSObject r = new JSObject();
        r.put("status", "GEOPEND");
        r.put("sessie", sessieId);
        r.put("naam", documentNaam);
        call.resolve(r);
    }

    @PluginMethod
    public void schrijf(PluginCall call) {
        if (!juisteSessie(call)) return;
        Integer index = call.getInt("index");
        String data = call.getString("data");
        TkExportSessie.Resultaat r = sessie.schrijfDeel(index == null ? -1 : index, data);
        if (!TkExportSessie.DEEL_OK.equals(r.status)) { opruimen(); }
        JSObject o = new JSObject();
        o.put("status", r.status);
        if (r.reden != null) o.put("reden", r.reden);
        o.put("geschreven", r.grootte);
        if (!TkExportSessie.DEEL_OK.equals(r.status)) o.put("verwijderd", r.verwijderd);
        call.resolve(o);
    }

    @PluginMethod
    public void voltooi(PluginCall call) {
        if (!juisteSessie(call)) return;
        TkExportSessie.Resultaat r = sessie.voltooi();
        JSObject o = new JSObject();
        o.put("status", r.status);
        if (r.reden != null) o.put("reden", r.reden);
        o.put("grootte", r.grootte);
        if (r.sha256 != null) o.put("sha256", r.sha256);
        o.put("naam", documentNaam);
        if (!r.geslaagd()) { o.put("verwijderd", r.verwijderd); opruimen(); }
        // Bij succes blijft de sessie open tot de webkant 'afbreken' (accountwissel na terugkomst) of een nieuwe
        // start doet; zo kan een na afloop vastgestelde accountwissel het document nog verwijderen.
        call.resolve(o);
    }

    @PluginMethod
    public void afbreken(PluginCall call) {
        String gevraagd = call.getString("status");
        if (sessie == null || sessieId == null || !sessieId.equals(call.getString("sessie"))) {
            JSObject o = new JSObject();
            o.put("status", TkExportSessie.WRITE_FAILED);
            o.put("reden", "geen_sessie");
            o.put("verwijderd", false);
            call.resolve(o);
            return;
        }
        TkExportSessie.Resultaat r = sluitSessie(gevraagd);
        JSObject o = new JSObject();
        o.put("status", r.status);
        o.put("verwijderd", r.verwijderd);
        call.resolve(o);
    }

    /** Sessie volledig vergeten na een geslaagde, door de webkant geaccepteerde export. */
    @PluginMethod
    public void afronden(PluginCall call) {
        if (sessieId != null && sessieId.equals(call.getString("sessie"))) opruimen();
        JSObject o = new JSObject();
        o.put("status", "AFGEROND");
        call.resolve(o);
    }

    private TkExportSessie.Resultaat sluitSessie(String status) {
        TkExportSessie.Resultaat r = sessie.breekAf(status);
        opruimen();
        return r;
    }

    private boolean juisteSessie(PluginCall call) {
        if (sessie == null || sessieId == null || !sessieId.equals(call.getString("sessie"))) {
            resultaat(call, TkExportSessie.WRITE_FAILED, "geen_sessie", false);
            return false;
        }
        return true;
    }

    private void resultaat(PluginCall call, String status, String reden, boolean verwijderd) {
        JSObject o = new JSObject();
        o.put("status", status);
        o.put("reden", reden);
        o.put("verwijderd", verwijderd);
        call.resolve(o);
    }

    private void opruimen() {
        if (bestemming != null) { bestemming.sluit(); bestemming = null; }
        sessie = null;
        sessieId = null;
        document = null;
        documentNaam = null;
    }

    private String weergaveNaam(Uri uri) {
        // Een provider kan bij een bestaande naam een andere naam kiezen (bijv. "kopie (1).tkbackup").
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                String n = c.getString(0);
                if (n != null && n.length() <= 255) return n;
            }
        } catch (RuntimeException ignored) { }
        return null;
    }
}
