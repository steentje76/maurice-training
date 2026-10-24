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
        // TK-REL-SEC-33: native export van de versleutelde reddingskopie (Storage Access Framework).
        registerPlugin(TkBestandOpslaanPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
