// pdfjs-dist v5 ships its own types for the package root.
// We only need a declaration for the worker's ?url Vite virtual import.
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
    const url: string;
    export default url;
}
