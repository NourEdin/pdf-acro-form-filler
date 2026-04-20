import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib'

export type FieldKind =
  | 'text'
  | 'check'
  | 'radio'
  | 'dropdown'
  | 'signature'
  | 'unknown'

export interface ExtractedField {
  fieldName: string
  fieldType: FieldKind
  readOnly: boolean
  maxLength?: number
  multiline?: boolean
  options?: string[]
}

function classifyField(field: import('pdf-lib').PDFField): ExtractedField {
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
      maxLength: typeof max === 'number' && max > 0 ? max : undefined,
      multiline: field.isMultiline(),
    }
  }
  if (field instanceof PDFCheckBox) {
    return { ...base, fieldType: 'check' }
  }
  if (field instanceof PDFRadioGroup) {
    const opts = field.getOptions().map((o) =>
      typeof o === 'string' ? o : (o as { exportValue?: string }).exportValue ?? '',
    ).filter(Boolean)
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

export async function extractAcroFormManifest(
  pdfBytes: ArrayBuffer | Uint8Array,
): Promise<{ fields: ExtractedField[]; canonicalOrder: string[] }> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields().map(classifyField)
  return { fields, canonicalOrder: fields.map((f) => f.fieldName) }
}

