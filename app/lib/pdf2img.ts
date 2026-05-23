import type { PdfConversionResult } from "~/types/PdfConversionResult";

// pdfjs-dist v5: import from the package root (not /build/pdf subpath)
// The worker URL is resolved via Vite's ?url import so no manual file copying
// is needed and the path survives hashing / base-URL changes at build time.
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let workerConfigured = false;

function ensureWorker() {
    if (!workerConfigured) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        workerConfigured = true;
    }
}

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
