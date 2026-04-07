/**
 * Template metadata and **canonical field order** for PDF filling.
 *
 * - `src/generated/acroform-manifest.json` is produced by `npm run dump:pdf-fields` from PDFs in
 *   `contracts/`. It lists each file’s AcroForm fields in pdf-lib order.
 * - **Canonical keys** for React form state / `values` are Salalah Beach [international] field
 *   names in that manifest order (`salalahCanonicalFieldOrder`). Every fill path ultimately
 *   maps those keys to the right widget name on each PDF (see `fillAcroForm.ts`).
 */
import acroformManifest from '../../../generated/acroform-manifest.json'
import type { Branch } from '../types'

export const TEMPLATE_FILES = {
  salalah: {
    local: 'Salalah Beach [local].pdf',
    international: 'Salalah Beach [international].pdf',
  },
  sifah: {
    local: 'Sifah [local].pdf',
    international: 'Sifah [international].pdf',
  },
} as const

export type TemplateFile =
  (typeof TEMPLATE_FILES)[keyof typeof TEMPLATE_FILES][Branch]

type ManifestEntry = (typeof acroformManifest)[number]

function entryForFile(file: string): ManifestEntry {
  const found = acroformManifest.find((m) => m.file === file)
  if (!found) {
    throw new Error(`acroform-manifest.json missing entry for: ${file}`)
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
