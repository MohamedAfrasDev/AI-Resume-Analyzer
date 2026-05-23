import type { PdfConversionResult } from "~/types/PdfConversionResult";

let pdfjsLib: any = null;

export async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;

    const lib = await import("pdfjs-dist/build/pdf"); // browser build
    lib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`;
    pdfjsLib = lib;
    return lib;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get 2D context");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;

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
        return { imageUrl: "", file: null, error: `Failed to convert PDF: ${err instanceof Error ? err.message : err}` };
    }
}
