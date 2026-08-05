package org.test.backendprojecty.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.test.backendprojecty.exception.BadRequestException;

import java.io.IOException;

@Service
public class PdfTextExtractionService {

    public String extractText(byte[] pdfBytes) {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(document);
            if (text == null || text.isBlank()) {
                throw new BadRequestException(
                        "Couldn't extract any text from this PDF — it may be a scanned image with no selectable text.");
            }
            // Some PDFs (embedded fonts, form fields, certain scanners/exporters) leave stray
            // NUL bytes in the extracted text. Postgres text columns can never store 0x00
            // regardless of encoding, so every caller that persists this text would otherwise
            // fail on insert — stripped once here rather than in each of the three callers.
            return text.replace("\u0000", "");
        } catch (IOException e) {
            throw new BadRequestException("Couldn't read this PDF file — it may be corrupted or password-protected.");
        }
    }
}
