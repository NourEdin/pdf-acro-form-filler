import { assertSlotAlignment, validateFieldDefinitions } from './validateAgainstManifest'
import {
  fieldMetaForSalalah,
  salalahCanonicalFieldOrder,
} from './manifest'
import type { Branch } from '../types'
import type { VisibleWhen } from '../types'

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

const meta = fieldMetaForSalalah()

export const fieldDefinitions: FieldDefinition[] =
  salalahCanonicalFieldOrder.map((formKey) => {
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

assertSlotAlignment()

if (import.meta.env.DEV) {
  const issues = validateFieldDefinitions(fieldDefinitions)
  if (issues.length > 0) {
    console.warn('[form-config] manifest validation:', issues)
  }
}

export function definitionsForBranch(branch: Branch): FieldDefinition[] {
  return fieldDefinitions.filter((d) => {
    if (d.readOnly) return false
    if (d.visibleWhen === 'always') return true
    return d.visibleWhen === branch
  })
}

export function requiredFormKeys(branch: Branch): string[] {
  return definitionsForBranch(branch).map((d) => d.formKey)
}
