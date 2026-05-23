export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}
