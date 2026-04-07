import { acroformManifest, salalahCanonicalFieldOrder } from './manifest'

export interface ManifestValidationIssue {
  kind: 'unknown_form_key' | 'read_only_in_template'
  formKey: string
  detail?: string
}

export function validateFieldDefinitions(
  defs: readonly { formKey: string }[],
): ManifestValidationIssue[] {
  const salalahEntry = acroformManifest.find(
    (m) => m.file === 'Salalah Beach [international].pdf',
  )
  if (!salalahEntry) {
    throw new Error('Manifest must include Salalah Beach [international].pdf')
  }
  const known = new Set(salalahEntry.fields.map((f) => f.fieldName))
  const readonly = new Set(
    salalahEntry.fields.filter((f) => f.readOnly).map((f) => f.fieldName),
  )
  const issues: ManifestValidationIssue[] = []
  for (const d of defs) {
    if (!known.has(d.formKey)) {
      issues.push({ kind: 'unknown_form_key', formKey: d.formKey })
    } else if (readonly.has(d.formKey)) {
      issues.push({
        kind: 'read_only_in_template',
        formKey: d.formKey,
        detail: 'Field is read-only on template',
      })
    }
  }
  return issues
}

/** Dev-time guard: canonical order length matches all templates. */
export function assertSlotAlignment(): void {
  const len = salalahCanonicalFieldOrder.length
  for (const m of acroformManifest) {
    if (m.fields.length !== len) {
      throw new Error(
        `Slot count mismatch for ${m.file}: expected ${len}, got ${m.fields.length}`,
      )
    }
  }
}
