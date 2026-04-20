import type { ExtractedField } from '../pdf/extractAcroForm'

export type FieldMeta = Map<
  string,
  { multiline?: boolean; readOnly: boolean; fieldType: string }
>

export function canonicalOrderFromExtracted(
  fields: readonly ExtractedField[],
): string[] {
  return fields.map((f) => f.fieldName)
}

export function fieldMetaFromExtracted(
  fields: readonly ExtractedField[],
): FieldMeta {
  const m: FieldMeta = new Map()
  for (const f of fields) {
    m.set(f.fieldName, {
      multiline: f.multiline,
      readOnly: f.readOnly,
      fieldType: f.fieldType,
    })
  }
  return m
}
