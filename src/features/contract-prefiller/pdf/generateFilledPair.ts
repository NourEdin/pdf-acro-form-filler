import type { Branch } from '../types'
import {
  salalahCanonicalFieldOrder,
  salalahTemplateFile,
  sifahFieldOrder,
  sifahTemplateFile,
  templateUrl,
} from '../config/manifest'
import {
  applyValuesToSalalahPdf,
  applyValuesToSifahPdf,
  loadPdf,
} from './fillAcroForm'

export interface GeneratedPdf {
  fileName: string
  bytes: Uint8Array
}

/**
 * One submit → two filled PDFs for the chosen branch (local vs international).
 *
 * 1. Pick filenames: e.g. local → Salalah Beach [local].pdf + Sifah [local].pdf
 * 2. Load both templates in parallel (`loadPdf` + `PDFDocument.load`)
 * 3. Mutate each document’s AcroForm with the same `values` object:
 *    - Salalah: write by **field name** (matches form keys)
 *    - Sifah: write by **index** into that branch’s Sifah field-name list (see `fillAcroForm.ts`)
 * 4. `pdfDoc.save()` returns a `Uint8Array` suitable for Blob/download
 */
export async function generateFilledPdfPair(
  branch: Branch,
  values: Record<string, string>,
): Promise<{ salalah: GeneratedPdf; sifah: GeneratedPdf }> {
  const salalahFile = salalahTemplateFile(branch)
  const sifahFile = sifahTemplateFile(branch)
  const sifahOrder = sifahFieldOrder(branch)

  const [salalahDoc, sifahDoc] = await Promise.all([
    loadPdf(templateUrl(salalahFile)),
    loadPdf(templateUrl(sifahFile)),
  ])

  applyValuesToSalalahPdf(salalahDoc, values, salalahCanonicalFieldOrder)
  applyValuesToSifahPdf(
    salalahCanonicalFieldOrder,
    sifahOrder,
    values,
    sifahDoc,
  )

  const salalahBytes = await salalahDoc.save()
  const sifahBytes = await sifahDoc.save()

  const branchSlug = branch === 'local' ? 'local' : 'international'
  return {
    salalah: {
      fileName: `Salalah-Beach-filled-${branchSlug}.pdf`,
      bytes: salalahBytes,
    },
    sifah: {
      fileName: `Sifah-filled-${branchSlug}.pdf`,
      bytes: sifahBytes,
    },
  }
}
