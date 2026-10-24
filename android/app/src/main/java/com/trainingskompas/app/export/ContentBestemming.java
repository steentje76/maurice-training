package com.trainingskompas.app.export;

import android.content.ContentResolver;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * TK-REL-SEC-33 — bestemming via de ContentResolver (SAF-document of, in instrumentatietests, een file-URI).
 * Schrijven met truncatie ("wt"), sync van de file descriptor vóór sluiten, teruglezen via openInputStream.
 * Verwijderen: DocumentsContract.deleteDocument (alleen het document dat deze sessie zelf aanmaakte); voor een
 * file-URI het bestand zelf. Geen logging, geen opslag van inhoud.
 */
public final class ContentBestemming implements TkExportSessie.Bestemming {
    private final ContentResolver cr;
    private final Uri uri;
    private ParcelFileDescriptor pfd;

    public ContentBestemming(ContentResolver cr, Uri uri) {
        if (cr == null || uri == null) throw new IllegalArgumentException("bestemming");
        this.cr = cr;
        this.uri = uri;
    }

    @Override
    public OutputStream openSchrijven() throws IOException {
        sluit();
        pfd = cr.openFileDescriptor(uri, "wt");
        if (pfd == null) throw new IOException("openen");
        return new FileOutputStream(pfd.getFileDescriptor());
    }

    @Override
    public void synchroniseer(OutputStream uit) throws IOException {
        if (uit instanceof FileOutputStream) ((FileOutputStream) uit).getFD().sync();
    }

    @Override
    public InputStream openLezen() throws IOException {
        sluit();
        InputStream in = cr.openInputStream(uri);
        if (in == null) throw new IOException("lezen");
        return in;
    }

    @Override
    public boolean verwijder() {
        sluit();
        if ("file".equals(uri.getScheme())) {
            File f = new File(uri.getPath());
            return f.delete() || !f.exists();
        }
        try {
            return DocumentsContract.deleteDocument(cr, uri);
        } catch (Exception e) {
            return false;
        }
    }

    public void sluit() {
        if (pfd != null) {
            try { pfd.close(); } catch (IOException ignored) { }
            pfd = null;
        }
    }
}
