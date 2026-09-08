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
        super.onCreate(savedInstanceState);
    }
}
