/**
 * Enumerates AcroForm fields for each contract PDF listed in .env (same keys as the Vite app).
 * Run: npm run dump:pdf-fields
 * Requirements: .env (copy from .env.example) + matching PDFs in contracts/
 * Output: src/generated/acroform-manifest.json
 */
import { config } from 'dotenv'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
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

const ENV_KEYS = [
  'VITE_CONTRACT_PDF_SALALAH_LOCAL',
  'VITE_CONTRACT_PDF_SALALAH_INTERNATIONAL',
  'VITE_CONTRACT_PDF_SIFAH_LOCAL',
  'VITE_CONTRACT_PDF_SIFAH_INTERNATIONAL',
] as const

config({ path: resolve(import.meta.dirname, '..', '.env') })

function requiredEnv(name: (typeof ENV_KEYS)[number]): string {
  const v = process.env[name]?.trim()
  if (!v) {
    console.error(`Missing ${name} in .env (copy .env.example)`)
    process.exit(1)
  }
  return v
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

  const manifest: ManifestEntry[] = []

  for (const envKey of ENV_KEYS) {
    const file = requiredEnv(envKey)
    const path = join(contractsDir, file)
    if (!existsSync(path)) {
      console.error(`File not found: ${path}\nPlace "${file}" from .env in contracts/`)
      process.exit(1)
    }
    const bytes = readFileSync(path)
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
