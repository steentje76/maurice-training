package com.trainingskompas.app;

import android.Manifest;
import android.util.Size;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * TkBarcodeScannerPlugin — ANDROID-BARCODE-SCANNER-opdracht.
 *
 * Native CameraX + Google ML Kit Barcode Scanning, exact het contract uit
 * sectie 5: startBarcodeScan/stopBarcodeScan/pauseBarcodeScan/
 * resumeBarcodeScan/setTorch/cameraPermissionStatus/requestCameraPermission.
 *
 * ARCHITECTUURGRENS (sectie 1, hard afgedwongen): dit plugin-bestand
 * levert UITSLUITEND {rawValue, format, timestamp} terug via het
 * "barcodeDetected"-event. Het bepaalt NOOIT voedingswaarden, verzint
 * NOOIT productgegevens, herberekent NOOIT porties en maakt NOOIT
 * zelfstandig een canonical product aan — dat blijft volledig bij de
 * bestaande, ongewijzigde JS-laag (NutritionCameraCapture,
 * NutritionFoundation2Core, de Wave 3 product-matching-pijplijn).
 *
 * PRIVACY (sectie 15): barcode-herkenning gebeurt volledig on-device via
 * ML Kit — er wordt NOOIT een cameraframe naar een externe server
 * gestuurd voor barcodeherkenning. Alleen de herkende identifier-string
 * verlaat deze klasse, via het Capacitor-event naar de JS-laag (die op
 * zijn beurt pas bij een lokale miss de bestaande Open Food Facts-lookup
 * aanroept — ongewijzigd, zie nutrition-off-lookup.js).
 */
@CapacitorPlugin(
    name = "TkBarcodeScanner",
    permissions = {
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera")
    }
)
public class TkBarcodeScannerPlugin extends Plugin {

    // Sectie 6: EAN_13/EAN_8/UPC_A geverifieerd bruikbaar (normalizeBarcode()
    // ondersteunt exact deze). CODE_128 en UPC_E bewust NIET geactiveerd --
    // zie de toelichting in core/nativeBarcodeScannerBridge.js.
    private static final int SUPPORTED_ML_KIT_FORMATS =
        Barcode.FORMAT_EAN_13 | Barcode.FORMAT_EAN_8 | Barcode.FORMAT_UPC_A;

    private ExecutorService cameraExecutor;
    private ProcessCameraProvider cameraProvider;
    private Camera camera;
    private BarcodeScanner barcodeScanner;
    private PreviewView previewView;
    private volatile boolean scanningPaused = false;
    // Sectie 8, duplicate scan protection — dezelfde regel als de JS-kant
    // (NativeBarcodeScannerBridge.createScanLock): zodra één geldige
    // detectie is doorgestuurd, wordt hier NIETS meer verstuurd totdat de
    // JS-laag expliciet resumeBarcodeScan() aanroept (nooit een impliciete
    // timer/auto-hervatting op native niveau — voorkomt dat tientallen
    // ML Kit-frame-events per fysieke barcode de JS-brug bereiken).
    //
    // BUGFIX (adversariële audit): een losse `volatile boolean` met een
    // check-then-set (`if (locked) return; locked = true;`) is GEEN
    // atomaire operatie -- ML Kit's Task-callbacks lopen niet gegarandeerd
    // sequentieel t.o.v. elkaar, dus twee bijna-gelijktijdige frames konden
    // in theorie allebei de check passeren vóór een van beide de vlag zette,
    // en dus allebei een event versturen. AtomicBoolean.compareAndSet is de
    // enige correcte, echt atomaire manier om "eerste geldige detectie wint"
    // af te dwingen.
    private final AtomicBoolean nativeResultLock = new AtomicBoolean(false);
    // BUGFIX (adversariële audit): een reeds aan ML Kit aangeboden frame
    // (barcodeScanner.process(image)) kan zijn resultaat nog asynchroon
    // terugsturen NADAT stopBarcodeScan() al liep (camera unbound, preview
    // verwijderd) -- zonder deze vlag zou dat een barcodeDetected-event naar
    // JS sturen terwijl het scannerscherm al gesloten is.
    private volatile boolean scannerStopped = true;
    // FINAL-MERGE-AUDIT bugfix: sessie/generation-isolatie. scannerStopped
    // alleen onderscheidt "wel/geen actieve sessie" -- het kan NIET
    // onderscheiden "sessie A gestopt, sessie B alweer gestart" van "sessie
    // A loopt nog", omdat scannerStopped na een nieuwe startBarcodeScan()
    // gewoon weer false is. Scenario: sessie A biedt een frame aan ML Kit
    // aan (analyzeImage) -> gebruiker sluit de scanner (stopBarcodeScan(),
    // scannerStopped=true) -> gebruiker/app opent de scanner meteen weer
    // (nieuwe startBarcodeScan(), scannerStopped=false) -> pas DAN komt
    // sessie A's oude, in-flight ML Kit-resultaat terug. Zonder een aparte
    // generation-check zou dat stale resultaat ten onrechte als "van de
    // huidige sessie" worden behandeld. sessionGeneration wordt bij elke
    // startBarcodeScan() opgehoogd; elk frame onthoudt bij het aanbieden
    // aan ML Kit welke generation actief was, en de async-callback vergelijkt
    // dat bij aankomst met de DAN actuele generation -- een mismatch
    // betekent altijd "hoort bij een inmiddels vervangen sessie", en wordt
    // stil genegeerd, ongeacht scannerStopped/nativeResultLock.
    private final AtomicInteger sessionGeneration = new AtomicInteger(0);

    @Override
    public void load() {
        cameraExecutor = Executors.newSingleThreadExecutor();
        barcodeScanner = BarcodeScanning.getClient(
            new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(SUPPORTED_ML_KIT_FORMATS)
                .build()
        );
    }

    @PluginMethod
    public void cameraPermissionStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("camera", getPermissionState("camera").toString());
        ret.put("canRequestAgain", ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.CAMERA) || getPermissionState("camera") != PermissionState.DENIED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("camera", "granted");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("camera", call, "cameraPermissionCallback");
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        PermissionState state = getPermissionState("camera");
        ret.put("camera", state.toString());
        // "don't ask again" (permanently denied): Android geeft geen directe
        // vlag; de gangbare, betrouwbare Capacitor/AndroidX-benadering is
        // shouldShowRequestPermissionRationale() == false NA een eerdere
        // weigering -- dat combineren we hier server-/native-side, zodat de
        // JS-kant (resolvePermissionUiState) geen aparte Android-API hoeft
        // te kennen (sectie 11, state D).
        boolean canAskAgain = state == PermissionState.GRANTED || ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.CAMERA);
        ret.put("canRequestAgain", canAskAgain);
        call.resolve(ret);
    }

    @PluginMethod
    public void startBarcodeScan(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            call.reject("CAMERA_PERMISSION_NOT_GRANTED");
            return;
        }
        nativeResultLock.set(false);
        scanningPaused = false;
        scannerStopped = false;
        sessionGeneration.incrementAndGet(); // FINAL-MERGE-AUDIT: nieuwe sessie, oude in-flight frames worden hierdoor herkenbaar "stale"

        // Native CameraX-preview wordt als achtergrond-View aan de Activity
        // toegevoegd; de WebView-achtergrond wordt transparant gemaakt zodat
        // de bestaande web-overlay (scanvlak/instructie/torch-knop, sectie 7)
        // er gewoon bovenop blijft renderen -- geen dubbele/duplicate UI-laag.
        getActivity().runOnUiThread(() -> {
            previewView = new PreviewView(getContext());
            previewView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            getBridge().getWebView().setBackgroundColor(android.graphics.Color.TRANSPARENT);
            ((ViewGroup) getBridge().getWebView().getParent()).addView(previewView, 0);

            ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(getContext());
            future.addListener(() -> {
                // BUGFIX (adversariële audit): ProcessCameraProvider.get()
                // gooit ExecutionException/InterruptedException, maar
                // bindCameraUseCases()/bindToLifecycle() KAN daarnaast een
                // ongerelateerde runtime-exception gooien (bv.
                // IllegalStateException/IllegalArgumentException als de
                // camera al door een andere component in gebruik is). Een
                // catch die alleen die twee checked exceptions afvangt liet
                // zo'n fout ongevangen door de plugin-laag heen breken --
                // nu vangt één brede catch(Exception) alles af en wordt
                // call.reject() ALTIJD aangeroepen, nooit een onbehandelde
                // crash.
                try {
                    cameraProvider = future.get();
                    bindCameraUseCases();
                    call.resolve();
                } catch (Exception e) {
                    scannerStopped = true;
                    call.reject("CAMERA_START_FAILED", e);
                }
            }, ContextCompat.getMainExecutor(getContext()));
        });
    }

    private void bindCameraUseCases() {
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        // Sectie 14: geen onnodig hoge resolutie -- 1280x720 is voor 1D-
        // retailbarcodes ruim voldoende en houdt image-analysis-throughput
        // hoog; STRATEGY_KEEP_ONLY_LATEST voorkomt een oplopende
        // analyse-achterstand (backpressure, sectie 14).
        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
            .setTargetResolution(new Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build();
        imageAnalysis.setAnalyzer(cameraExecutor, this::analyzeImage);

        CameraSelector cameraSelector = new CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_BACK)
            .build();

        cameraProvider.unbindAll();
        camera = cameraProvider.bindToLifecycle(
            (androidx.lifecycle.LifecycleOwner) getActivity(), cameraSelector, preview, imageAnalysis);
    }

    @androidx.camera.core.ExperimentalGetImage
    private void analyzeImage(@NonNull ImageProxy imageProxy) {
        if (scannerStopped || scanningPaused || nativeResultLock.get() || imageProxy.getImage() == null) {
            imageProxy.close();
            return;
        }
        // FINAL-MERGE-AUDIT: vastleggen bij het AANBIEDEN van dit frame aan
        // ML Kit, niet pas bij het terugkomen van het resultaat -- zodat een
        // stop+restart die precies tussen deze regel en de callback plaatsvindt
        // altijd correct als "andere generation" wordt herkend.
        final int frameGeneration = sessionGeneration.get();
        InputImage image = InputImage.fromMediaImage(imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());
        // Expliciete executor i.p.v. het impliciete main-thread-default van
        // ML Kit's Task-listeners -- zelfde executor als de analyzer zelf,
        // zodat er nooit twijfel bestaat op welke thread handleBarcodeResults
        // draait (audit-eis: geen impliciete threading-aannames).
        barcodeScanner.process(image)
            .addOnSuccessListener(cameraExecutor, barcodes -> handleBarcodeResults(barcodes, frameGeneration))
            .addOnFailureListener(cameraExecutor, e -> { /* voorbijgaande decode-fout: gewoon volgend frame proberen, geen error-event (sectie 17, spiegelt het web-pad) */ })
            .addOnCompleteListener(cameraExecutor, task -> imageProxy.close());
    }

    // Sectie 17: een gescande barcode is untrusted input. Een normale EAN-13/
    // UPC/CODE-128-retailbarcode is nooit langer dan enkele tientallen
    // tekens; een sane bovengrens is defense-in-depth tegen een
    // gemanipuleerde/misvormde decode voordat de string de Capacitor-brug
    // en de JS-laag bereikt (die zelf ook al veilig valideert, dit is een
    // extra, goedkope laag, geen vervanging daarvan).
    private static final int MAX_RAW_VALUE_LENGTH = 64;

    /**
     * handleBarcodeResults: sectie 1, harde grens. Deze methode bepaalt
     * NOOIT welke van meerdere gelijktijdig zichtbare barcodes "de juiste"
     * is -- zodra ML Kit er meer dan één met een verschillende waarde
     * detecteert, wordt GEEN event verstuurd; de JS-laag/bestaande
     * NutritionCameraCapture.resolveBarcodeDetectionResult() blijft de
     * enige plek die "MULTIPLE_BARCODES" mag concluderen. Hier sturen we
     * daarom, bij twijfel, gewoon niets door in plaats van zelf te kiezen.
     *
     * FINAL-MERGE-AUDIT: frameGeneration is de sessionGeneration die gold
     * toen DIT frame aan ML Kit werd aangeboden (analyzeImage). Als de
     * huidige sessionGeneration inmiddels anders is (scanner tussentijds
     * gestopt EN opnieuw gestart terwijl dit frame nog onderweg was), hoort
     * dit resultaat bij een reeds vervangen sessie en wordt het stil
     * genegeerd -- ongeacht scannerStopped/nativeResultLock, die dit
     * specifieke stop-dan-herstart-scenario niet kunnen onderscheiden van
     * "dezelfde sessie loopt nog".
     */
    private void handleBarcodeResults(List<Barcode> barcodes, int frameGeneration) {
        if (frameGeneration != sessionGeneration.get()) return; // stale resultaat van een inmiddels vervangen sessie
        if (scannerStopped || barcodes == null || barcodes.isEmpty()) return; // BUGFIX: nooit een event na stop
        String eersteWaarde = null;
        for (Barcode b : barcodes) {
            String raw = b.getRawValue();
            if (raw == null || raw.isEmpty() || raw.length() > MAX_RAW_VALUE_LENGTH) continue; // untrusted input, sectie 17
            if (eersteWaarde == null) eersteWaarde = raw;
            else if (!eersteWaarde.equals(raw)) return; // meerdere, verschillende barcodes tegelijk -- geen keuze maken, niets versturen
        }
        if (eersteWaarde == null) return;
        Barcode gekozen = barcodes.get(0);
        // BUGFIX (adversariële audit): compareAndSet is de enige echt
        // atomaire manier om "eerste geldige detectie wint" af te dwingen --
        // zie de toelichting bij het veld hierboven.
        if (!nativeResultLock.compareAndSet(false, true)) return;
        if (scannerStopped) return; // dubbele check: tussen de bovenste guard en hier kan stop() net hebben gelopen

        JSObject event = new JSObject();
        event.put("rawValue", eersteWaarde);
        event.put("format", formatToString(gekozen.getFormat()));
        event.put("timestamp", System.currentTimeMillis());
        notifyListeners("barcodeDetected", event);
    }

    private String formatToString(int mlKitFormat) {
        if (mlKitFormat == Barcode.FORMAT_EAN_13) return "EAN_13";
        if (mlKitFormat == Barcode.FORMAT_EAN_8) return "EAN_8";
        if (mlKitFormat == Barcode.FORMAT_UPC_A) return "UPC_A";
        return "UNKNOWN"; // wordt door de JS-bridge (mapNativeResultToRawDetection) al geweigerd, nooit doorgezet als geldige detectie
    }

    @PluginMethod
    public void pauseBarcodeScan(PluginCall call) {
        scanningPaused = true;
        call.resolve();
    }

    @PluginMethod
    public void resumeBarcodeScan(PluginCall call) {
        // Sectie 8: expliciete hervatting -- de JS-brug roept dit uitsluitend
        // aan als de gebruiker teruggaat of het product niet bruikbaar bleek,
        // nooit automatisch na een timer.
        nativeResultLock.set(false);
        scanningPaused = false;
        call.resolve();
    }

    @PluginMethod
    public void setTorch(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        if (camera == null || camera.getCameraInfo() == null || !Boolean.TRUE.equals(camera.getCameraInfo().hasFlashUnit())) {
            call.reject("TORCH_UNAVAILABLE");
            return;
        }
        camera.getCameraControl().enableTorch(enabled);
        call.resolve();
    }

    @PluginMethod
    public void stopBarcodeScan(PluginCall call) {
        scannerStopped = true; // BUGFIX: vóór de UI-teardown zetten, zodat een reeds in-flight ML Kit-callback zich hier meteen tegen wapent
        getActivity().runOnUiThread(() -> {
            if (cameraProvider != null) cameraProvider.unbindAll();
            if (previewView != null && previewView.getParent() != null) {
                ((ViewGroup) previewView.getParent()).removeView(previewView);
                previewView = null;
            }
            if (camera != null && camera.getCameraInfo() != null && Boolean.TRUE.equals(camera.getCameraInfo().hasFlashUnit())) {
                camera.getCameraControl().enableTorch(false); // TORCH: altijd uit bij sluiten van de scanner (sectie "Torch")
            }
            getBridge().getWebView().setBackgroundColor(android.graphics.Color.WHITE);
        });
        nativeResultLock.set(false);
        scanningPaused = false;
        if (call != null) call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopBarcodeScan(null);
        if (cameraExecutor != null) cameraExecutor.shutdown();
        if (barcodeScanner != null) barcodeScanner.close();
        super.handleOnDestroy();
    }
}
