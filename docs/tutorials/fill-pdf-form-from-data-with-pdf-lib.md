# Tutorial: Save arbitrary data into a PDF AcroForm (pdf-lib)

This guide shows how a **React** developer can take **structured data** (from an API, form state, Redux, etc.) and **write it into fillable fields** of a PDF template, then offer a download or upload the bytes elsewhere. It uses **[pdf-lib](https://pdf-lib.js.org/)** in the **browser**; the same APIs work in **Node** if you load bytes from disk instead of `fetch`.

---

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **A PDF template with AcroForm fields** | You must know (or have enumerated) each field’s **AcroForm name** and **widget type** (text, checkbox, …). |
| **pdf-lib** | `npm install pdf-lib`. |
| **Data shape you control** | e.g. `Record<string, string>` for text, booleans for checks. Keys in your data must map to PDF field **names** (or you maintain an explicit map from API property → PDF name). |
| **(Browser)** **Same-origin or CORS** for template URL | If the PDF is on another domain, the server must allow `fetch`. |
| **(Optional)** **TypeScript** | Helps when describing API responses and your mapper. |

**Not covered:** Digital signatures, XFA-only forms, server-side caching at scale, or legal compliance for generated documents.

---

## Concepts (short)

1. Load the **unchanged template** as a `PDFDocument`.
2. Get `const form = pdfDoc.getForm()`.
3. For each logical value, call the right setter on the matching field (`getTextField`, `getCheckBox`, etc.).
4. Call **`form.updateFieldAppearances()`** so many viewers redraw field content correctly.
5. Call **`pdfDoc.save()`** → `Uint8Array` → `Blob` → download or `POST` to your API.

---

## 1. Map API (or state) data to PDF field names

Your API might return:

```json
{
  "customerName": "Ada Lovelace",
  "startDate": "2026-04-01",
  "acceptTerms": true
}
```

PDF field names are often generic (`Text1`, `ClientName`). Keep a **single mapping object** in your app:

```typescript
const PDF_FIELD_NAMES = {
  customerName: 'ClientName',
  startDate: 'ContractStart',
  acceptTerms: 'TermsAccepted',
} as const

type ApiShape = {
  customerName: string
  startDate: string
  acceptTerms: boolean
}

type PdfTextKey = Exclude<keyof ApiShape, 'acceptTerms'>

function apiResponseToPdfPayload(data: ApiShape): {
  text: Record<string, string>
  checks: Record<string, boolean>
} {
  const text: Record<string, string> = {
    [PDF_FIELD_NAMES.customerName]: data.customerName,
    [PDF_FIELD_NAMES.startDate]: data.startDate,
  }
  const checks: Record<string, boolean> = {
    [PDF_FIELD_NAMES.acceptTerms]: data.acceptTerms,
  }
  return { text, checks }
}
```

In React, this mapping can live next to your API types or in a `pdfFieldMap.ts`.

---

## 2. Load the template and fill text fields

```typescript
import { PDFDocument } from 'pdf-lib'

async function fillPdfTemplate(
  templateUrl: string,
  textValues: Record<string, string>,
): Promise<Uint8Array> {
  const res = await fetch(templateUrl)
  if (!res.ok) throw new Error(`Failed to load template: ${res.status}`)
  const pdf = await PDFDocument.load(await res.arrayBuffer())
  const form = pdf.getForm()

  for (const [acroName, value] of Object.entries(textValues)) {
    try {
      form.getTextField(acroName).setText(value ?? '')
    } catch {
      // Missing field, wrong type, or name typo — log in dev, don’t crash the whole export
      console.warn(`Skipping text field: ${acroName}`)
    }
  }

  form.updateFieldAppearances()
  return pdf.save()
}
```

**Multiline text:** same `PDFTextField`; pdf-lib still uses `setText`. Very long strings may overflow the visual box—test in your template.

---

## 3. Fill checkboxes and dropdowns (common cases)

### Checkbox

```typescript
import { PDFCheckBox } from 'pdf-lib'

function setCheckbox(form: import('pdf-lib').PDFForm, name: string, checked: boolean) {
  const field = form.getCheckBox(name)
  if (checked) field.check()
  else field.uncheck()
}
```

### Dropdown

```typescript
function setDropdown(form: import('pdf-lib').PDFForm, name: string, option: string) {
  form.getDropdown(name).select(option)
}
```

Option strings must match one of the PDF’s defined export values (discover via enumeration or Acrobat).

### Radio group

```typescript
function setRadio(form: import('pdf-lib').PDFForm, groupName: string, exportValue: string) {
  form.getRadioGroup(groupName).select(exportValue)
}
```

Call **`form.updateFieldAppearances()`** once after all updates.

---

## 4. React: combine API + download

Example flow inside a component or hook:

```typescript
import { useCallback, useState } from 'react'

async function fetchContractPayload(): Promise<{
  customerName: string
  startDate: string
  acceptTerms: boolean
}> {
  const res = await fetch('/api/contract-draft')
  if (!res.ok) throw new Error('API error')
  return res.json()
}

export function useFilledPdfDownload() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchContractPayload()
      const { text, checks } = apiResponseToPdfPayload(data)

      const res = await fetch('/templates/ContractTemplate.pdf')
      const pdf = await PDFDocument.load(await res.arrayBuffer())
      const form = pdf.getForm()

      for (const [k, v] of Object.entries(text)) {
        try {
          form.getTextField(k).setText(v)
        } catch {
          console.warn('skip', k)
        }
      }
      for (const [k, v] of Object.entries(checks)) {
        try {
          const cb = form.getCheckBox(k)
          v ? cb.check() : cb.uncheck()
        } catch {
          console.warn('skip check', k)
        }
      }

      form.updateFieldAppearances()
      const bytes = await pdf.save()

      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contract-filled.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  return { download, busy, error }
}
```

**Performance:** `pdf-lib` is not tiny. Consider **dynamic `import('pdf-lib')`** so the main bundle stays small until the user exports a PDF.

---

## 5. Node (optional sketch)

Same filling code works if you replace `fetch` with `readFile` and write the `Uint8Array` to disk or return it from an Express route. That is useful when templates must stay private or CPU work should not run on low-end phones.

---

## 6. Pitfalls

| Issue | What to do |
| ----- | ---------- |
| **Wrong field name** | `getTextField` throws. Catch and log; re-run field extraction on the template. |
| **Read-only fields** | May refuse updates or appear unchanged; fix permissions in the source PDF. |
| **Unicode / missing glyphs** | Depends on fonts embedded in the template; pdf-lib can **embed** fonts for advanced cases. |
| **Flattened forms** | If fields were flattened in Acrobat, there are no AcroForm widgets left to fill. |
| **Security / PII** | Client-side fill exposes the template URL and logic; sensitive flows may belong on the server. |

---

## Companion tutorial

To **discover** field names and types in an unfamiliar PDF first, see **“Extract AcroForm field metadata from a PDF (pdf-lib)”** in the same folder.
