import { PDFDocument } from 'pdf-lib'

/**
 * PDF AcroForm filling helpers (pdf-lib).
 *
 * pdf-lib loads the PDF bytes, exposes `pdfDoc.getForm()` as a `PDFForm`, and lets you
 * address fields by their AcroForm name. Text widgets use `form.getTextField(name).setText(...)`.
 * After updates, `form.updateFieldAppearances()` refreshes how many viewers draw field values.
 *
 * This app only fills **text** fields today (`PDFTextField`). Checkboxes, radios, and dropdowns
 * would use `getCheckBox`, `getRadioGroup`, `getDropdown` instead.
 */

/**
 * Salalah Beach (local or international): AcroForm **names** match our canonical list exactly,
 * and local/international Salalah PDFs share the same names in the same order.
 *
 * Form state is keyed by those names (e.g. "Text Field 93"). For each name we look up the
 * string in `values` and write it to the widget with the same name.
 */
export function applyValuesToSalalahPdf(
  pdf: PDFDocument,
  values: Record<string, string>,
  canonicalOrder: readonly string[],
): void {
  const form = pdf.getForm()
  for (const name of canonicalOrder) {
    const text = values[name] ?? ''
    try {
      form.getTextField(name).setText(text)
    } catch {
      /* Field is missing, not a text field, or not compatible — skip to keep generation robust */
    }
  }
  form.updateFieldAppearances()
}

/**
 * Sifah PDFs use different AcroForm **names** and sometimes different **order** than Salalah,
 * but the contract layout still has the same number of logical "slots" (one index = one box).
 *
 * We treat index `i` as the same semantic slot on both venues:
 * - `canonicalFieldOrder[i]` = AcroForm name on Salalah (also the key in `values`)
 * - `sifahFieldOrder[i]`     = AcroForm name on this Sifah file
 *
 * So: value for user input key `canonicalFieldOrder[i]` is written to `getTextField(sifahFieldOrder[i])`.
 */
export function applyValuesToSifahPdf(
  canonicalFieldOrder: readonly string[],
  sifahFieldOrder: readonly string[],
  values: Record<string, string>,
  pdf: PDFDocument,
): void {
  if (canonicalFieldOrder.length !== sifahFieldOrder.length) {
    throw new Error(
      `Sifah slot length ${sifahFieldOrder.length} does not match canonical ${canonicalFieldOrder.length}`,
    )
  }
  const form = pdf.getForm()
  for (let i = 0; i < canonicalFieldOrder.length; i++) {
    const key = canonicalFieldOrder[i]!
    const target = sifahFieldOrder[i]!
    const text = values[key] ?? ''
    try {
      form.getTextField(target).setText(text)
    } catch {
      /* Same as Salalah: skip incompatible fields */
    }
  }
  form.updateFieldAppearances()
}

/** Fetches template bytes (browser: from `public/` via URL) and parses them with pdf-lib. */
export async function loadPdf(url: string): Promise<PDFDocument> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load PDF (${res.status}): ${url}`)
  }
  return PDFDocument.load(await res.arrayBuffer())
}
