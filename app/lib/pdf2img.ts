import type { PdfConversionResult } from "~/types/PdfConversionResult";

// pdfjs-dist v5: import from the package root (not /build/pdf subpath).
// The worker URL is resolved via Vite's ?url import so no manual file copying
// is needed and the path survives content-hash renaming at build time.
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let workerConfigured = false;

function ensureWorker() {
    if (!workerConfigured) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        workerConfigured = true;
    }
}

/**
 * Render the first page of a PDF file to a PNG File object.
 * Used to generate the visual thumbnail shown on the resume review page.
 */
export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        ensureWorker();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get 2D canvas context");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // pdfjs-dist v5 requires `canvas` alongside `canvasContext`
        await page.render({ canvasContext: context, canvas, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    const originalName = file.name.replace(/\.pdf$/i, "");
                    const imageFile = new File([blob], `${originalName}.png`, { type: "image/png" });
                    resolve({ imageUrl: URL.createObjectURL(blob), file: imageFile });
                } else {
                    resolve({ imageUrl: "", file: null, error: "Failed to create image blob" });
                }
            }, "image/png");
        });
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * Extract the plain text content from every page of a PDF file.
 *
 * This is used to feed the resume text directly to the AI as a string prompt,
 * which is far more reliable than trying to send a file reference or a base64
 * image through Puter's AI API. Claude receives the actual characters — not
 * pixels — which gives more accurate analysis and works across all pages.
 *
 * Returns an empty string if the PDF has no text layer (e.g. a scanned image
 * PDF). Callers should check for this case and show an appropriate error.
 */
export async function extractPdfText(file: File): Promise<string> {
    try {
        ensureWorker();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const pageTexts: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // TextItem has a `str` field; TextMarkedContent does not — skip those.
            const pageText = textContent.items
                .filter((item): item is typeof item & { str: string } => "str" in item)
                .map((item) => (item as { str: string }).str)
                .join(" ");

            if (pageText.trim()) pageTexts.push(pageText.trim());
        }

        return pageTexts.join("\n\n");
    } catch (err) {
        // Return empty string — callers decide how to handle a failed extraction.
        console.warn("PDF text extraction failed:", err);
        return "";
    }
}
