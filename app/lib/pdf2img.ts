// types/PdfConversionResult.ts
export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

// utils/pdfConverter.ts
import type { PdfConversionResult } from "~/types/PdfConversionResult";

// Import worker properly (works with Vite, Webpack, Next, Remix)
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = workerSrc;
        pdfjsLib = lib;
        return lib;
    });

    return loadPromise;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        // Scale down to avoid memory issues
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Failed to get 2D context from canvas");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render page
        await page.render({ canvasContext: context, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob (canvas empty or too large)",
                        });
                    }
                },
                "image/png",
                1.0
            );
        });
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err instanceof Error ? err.message : err}`,
        };
    }
}
