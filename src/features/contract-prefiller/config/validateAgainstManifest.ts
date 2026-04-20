export interface ExtractedFieldLike {
  fieldName: string
  readOnly: boolean
}

export interface ManifestValidationIssue {
  kind: 'unknown_form_key' | 'read_only_in_template'
  formKey: string
  detail?: string
}

export function validateFieldDefinitions(
  defs: readonly { formKey: string }[],
  extracted: readonly ExtractedFieldLike[],
): ManifestValidationIssue[] {
  const known = new Set(extracted.map((f) => f.fieldName))
  const readonly = new Set(extracted.filter((f) => f.readOnly).map((f) => f.fieldName))
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

export function assertSlotAlignment(): void {
  // No-op: slot alignment across multiple templates was a build-time concern.
}
