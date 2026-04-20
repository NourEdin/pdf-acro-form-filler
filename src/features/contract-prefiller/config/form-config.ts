import { validateFieldDefinitions } from './validateAgainstManifest'
import type { FieldMeta } from './manifest'
import type { Branch, VisibleWhen } from '../types'

export interface FieldDefinition {
  formKey: string
  label: string
  visibleWhen: VisibleWhen
  multiline?: boolean
  readOnly?: boolean
}

/**
 * HTML field list and branch visibility. `formKey` must match a Salalah **canonical** AcroForm name
 * (same strings as `salalahCanonicalFieldOrder` / user `values` keys passed into PDF generation).
 *
 * Edit `localOnlyKeys` / `internationalOnlyKeys` to show or hide inputs by Local vs International.
 */
const localOnlyKeys = new Set<string>([])
const internationalOnlyKeys = new Set<string>([])

export function buildFieldDefinitions(
  canonicalOrder: readonly string[],
  meta: FieldMeta,
): FieldDefinition[] {
  const defs: FieldDefinition[] = canonicalOrder.map((formKey) => {
    const m = meta.get(formKey)
    let visibleWhen: VisibleWhen = 'always'
    if (localOnlyKeys.has(formKey)) visibleWhen = 'local'
    if (internationalOnlyKeys.has(formKey)) visibleWhen = 'international'
    return {
      formKey,
      label: formKey.replace(/^Text Field\s+/i, 'Field '),
      visibleWhen,
      multiline: m?.multiline,
      readOnly: m?.readOnly,
    }
  })

  if (import.meta.env.DEV) {
    const issues = validateFieldDefinitions(defs, [...meta].map(([fieldName, v]) => ({ fieldName, readOnly: v.readOnly })))
    if (issues.length > 0) {
      console.warn('[form-config] extracted field validation:', issues)
    }
  }

  return defs
}

export function definitionsForBranch(
  branch: Branch,
  defs: readonly FieldDefinition[],
): FieldDefinition[] {
  return defs.filter((d) => {
    if (d.readOnly) return false
    if (d.visibleWhen === 'always') return true
    return d.visibleWhen === branch
  })
}

export function requiredFormKeys(
  branch: Branch,
  defs: readonly FieldDefinition[],
): string[] {
  return definitionsForBranch(branch, defs).map((d) => d.formKey)
}
