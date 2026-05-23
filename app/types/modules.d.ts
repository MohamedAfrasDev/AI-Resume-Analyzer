// pdfjs-dist v2.x does not ship types for its build subpath.
// Declare it as `any` so the dynamic import in pdf2img.ts compiles cleanly.
declare module 'pdfjs-dist/build/pdf';
