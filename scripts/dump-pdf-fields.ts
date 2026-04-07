/**
 * Enumerates AcroForm fields in each PDF under contracts/.
 * Run: npm run dump:pdf-fields
 * Output: src/generated/acroform-manifest.json (committed for app + validation).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib'

type FieldKind = 'text' | 'check' | 'radio' | 'dropdown' | 'signature' | 'unknown'

interface ManifestField {
  fieldName: string
  fieldType: FieldKind
  readOnly: boolean
  maxLength?: number
  multiline?: boolean
  options?: string[]
}

interface ManifestEntry {
  file: string
  fields: ManifestField[]
}

/** Maps pdf-lib’s concrete field class to a small JSON-serializable record for the manifest. */
function classifyField(field: import('pdf-lib').PDFField): ManifestField {
  const fieldName = field.getName()
  const base = {
    fieldName,
    readOnly: field.isReadOnly(),
  }

  if (field instanceof PDFTextField) {
    const max = field.getMaxLength()
    return {
      ...base,
      fieldType: 'text',
      maxLength: max > 0 ? max : undefined,
      multiline: field.isMultiline(),
    }
  }
  if (field instanceof PDFCheckBox) {
    return { ...base, fieldType: 'check' }
  }
  if (field instanceof PDFRadioGroup) {
    const opts = field.getOptions().map((o) => o.exportValue)
    return { ...base, fieldType: 'radio', options: opts }
  }
  if (field instanceof PDFDropdown) {
    const opts = field.getOptions()
    return { ...base, fieldType: 'dropdown', options: opts }
  }
  const ctor = field.constructor?.name ?? ''
  if (ctor.includes('Signature') || ctor === 'PDFSignature') {
    return { ...base, fieldType: 'signature' }
  }
  return { ...base, fieldType: 'unknown' }
}

async function main() {
  const root = join(import.meta.dirname, '..')
  const contractsDir = join(root, 'contracts')
  const outDir = join(root, 'src', 'generated')
  const outFile = join(outDir, 'acroform-manifest.json')

  const pdfs = readdirSync(contractsDir).filter((f) => f.toLowerCase().endsWith('.pdf'))
  if (pdfs.length === 0) {
    console.error('No PDFs found in contracts/')
    process.exit(1)
  }

  const manifest: ManifestEntry[] = []

  for (const file of pdfs.sort()) {
    const bytes = readFileSync(join(contractsDir, file))
    const pdfDoc = await PDFDocument.load(bytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields().map(classifyField)
    manifest.push({ file, fields })
    console.log(`${file}: ${fields.length} fields`)
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${outFile}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
