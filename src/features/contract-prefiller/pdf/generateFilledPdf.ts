import { applyValuesToSalalahPdf, loadPdfFromBytes } from './fillAcroForm'

export async function generateFilledPdf(args: {
  templateBytes: ArrayBuffer
  values: Record<string, string>
  canonicalOrder: readonly string[]
}): Promise<Uint8Array> {
  const pdfDoc = await loadPdfFromBytes(args.templateBytes)
  applyValuesToSalalahPdf(pdfDoc, args.values, args.canonicalOrder)
  return pdfDoc.save()
}

