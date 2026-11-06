package com.trainingskompas.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ANDROID-BARCODE-SCANNER-opdracht: registratie moet vóór
        // super.onCreate() gebeuren (Capacitor-conventie), anders mist de
        // eerste page-load de plugin-bridge.
        registerPlugin(TkBarcodeScannerPlugin.class);
        // MoveKit #504 — staged encrypted offline native video capability.
        // Plugin itself fails closed in release; no UI is activated yet.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            registerPlugin(TkOfflineMediaPlugin.class);
        }
        super.onCreate(savedInstanceState);
    }
}
