/**
 * Template metadata and **canonical field order** for PDF filling.
 *
 * - Template **filenames** come from `.env` (`VITE_CONTRACT_PDF_*`); copy `.env.example` to `.env`.
 * - PDF bytes are **not** tracked in git; place matching files in `contracts/` and `public/contracts/`.
 * - `src/generated/acroform-manifest.json` is produced by `npm run dump:pdf-fields` (uses the same env
 *   keys). Its `file` entries must match these names.
 * - **Canonical keys** for React form state / `values` are the **international** Salalah template’s
 *   AcroForm names in manifest order (`salalahCanonicalFieldOrder`).
 */
import acroformManifest from '../../../generated/acroform-manifest.json'
import type { Branch } from '../types'

const ENV = {
  salalahLocal: 'VITE_CONTRACT_PDF_SALALAH_LOCAL',
  salalahInternational: 'VITE_CONTRACT_PDF_SALALAH_INTERNATIONAL',
  sifahLocal: 'VITE_CONTRACT_PDF_SIFAH_LOCAL',
  sifahInternational: 'VITE_CONTRACT_PDF_SIFAH_INTERNATIONAL',
} as const

function pdfFileName(varName: (typeof ENV)[keyof typeof ENV]): string {
  const raw = import.meta.env[varName]
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      `[manifest] Missing or empty ${varName} in .env — copy .env.example to .env and set all VITE_CONTRACT_PDF_* filenames.`,
    )
  }
  return raw.trim()
}

export const TEMPLATE_FILES = {
  salalah: {
    local: pdfFileName(ENV.salalahLocal),
    international: pdfFileName(ENV.salalahInternational),
  },
  sifah: {
    local: pdfFileName(ENV.sifahLocal),
    international: pdfFileName(ENV.sifahInternational),
  },
} as const

export type TemplateFile =
  (typeof TEMPLATE_FILES)[keyof typeof TEMPLATE_FILES][Branch]

type ManifestEntry = (typeof acroformManifest)[number]

function entryForFile(file: string): ManifestEntry {
  const found = acroformManifest.find((m) => m.file === file)
  if (!found) {
    throw new Error(
      `acroform-manifest.json missing entry for: ${file}. Run npm run dump:pdf-fields after placing PDFs and aligning .env names.`,
    )
  }
  return found
}

/** Ordered AcroForm names on Salalah (intl = local for this project); used as form value keys. */
export const salalahCanonicalFieldOrder: string[] = entryForFile(
  TEMPLATE_FILES.salalah.international,
).fields.map((f) => f.fieldName)

export function salalahTemplateFile(branch: Branch): string {
  return branch === 'local'
    ? TEMPLATE_FILES.salalah.local
    : TEMPLATE_FILES.salalah.international
}

export function sifahTemplateFile(branch: Branch): string {
  return branch === 'local'
    ? TEMPLATE_FILES.sifah.local
    : TEMPLATE_FILES.sifah.international
}

/**
 * Ordered AcroForm names on the Sifah PDF for this branch. Same length as `salalahCanonicalFieldOrder`;
 * index `i` is the slot paired with canonical key `salalahCanonicalFieldOrder[i]`.
 */
export function sifahFieldOrder(branch: Branch): string[] {
  return entryForFile(sifahTemplateFile(branch)).fields.map((f) => f.fieldName)
}

/** Extra widget metadata (multiline, readOnly) keyed by canonical Salalah name — drives HTML fields. */
export function fieldMetaForSalalah(): Map<
  string,
  { multiline?: boolean; readOnly: boolean; fieldType: string }
> {
  const m = new Map<
    string,
    { multiline?: boolean; readOnly: boolean; fieldType: string }
  >()
  for (const f of entryForFile(TEMPLATE_FILES.salalah.international).fields) {
    m.set(f.fieldName, {
      multiline: f.multiline,
      readOnly: f.readOnly,
      fieldType: f.fieldType,
    })
  }
  return m
}

/** Vite serves files from `public/contracts/` at `/contracts/...`; encode bracketed filenames. */
export function templateUrl(fileName: string): string {
  return `/contracts/${encodeURIComponent(fileName)}`
}

export { acroformManifest }
