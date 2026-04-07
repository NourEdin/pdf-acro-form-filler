# Tutorial: Extract AcroForm field metadata from a PDF (pdf-lib)

This guide shows how a **React** (or plain browser / Node) developer can **list names and types** of interactive form fields in a PDF that uses the classic **AcroForm** model. The examples use **[pdf-lib](https://pdf-lib.js.org/)**, a JavaScript library that runs in the browser and in Node without native binaries.

---

## Prerequisites

Before you start, you should have:

| Requirement | Notes |
| ----------- | ----- |
| **A PDF with real AcroForm fields** | Fields created in Acrobat, LibraOffice, etc. as “form” widgets. Flattened-only or purely static PDFs often expose **no** fillable fields. |
| **pdf-lib** | `npm install pdf-lib`. This tutorial targets v1.x APIs (`getForm()`, `PDFTextField`, …). |
| **JavaScript / TypeScript** | Comfortable reading async code (`async`/`await`). |
| **(Browser path)** A way to get **PDF bytes** | e.g. `fetch(url)`, file `<input type="file">`, or bundled asset. |
| **(Node path)** **Node 18+** (optional) | For reading files from disk with `fs`; any recent LTS is fine. |

**Not covered here:** XFA-heavy government forms, some “hybrid” workflows where the only fillable layer is not a standard AcroForm pdf-lib can enumerate. If `getForm().getFields()` is empty, the PDF may need a different tool or template fixes.

---

## Concepts (short)

- **AcroForm**: the part of the PDF that defines named fields (`T` entries) and widgets on pages.
- **pdf-lib** loads a PDF from bytes, returns a `PDFDocument`. **`pdfDoc.getForm()`** returns a `PDFForm`; **`getFields()`** lists all fields pdf-lib understands as `PDFField` subclasses (`PDFTextField`, `PDFCheckBox`, etc.).

---

## 1. Load the PDF

You always start from a **`Uint8Array`** or **`ArrayBuffer`** of the file.

### In the browser (e.g. inside a React app)

```typescript
import { PDFDocument } from 'pdf-lib'

async function loadPdfFromUrl(url: string): Promise<PDFDocument> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const bytes = await res.arrayBuffer()
  return PDFDocument.load(bytes)
}
```

From a file input:

```typescript
async function loadPdfFromFile(file: File): Promise<PDFDocument> {
  return PDFDocument.load(await file.arrayBuffer())
}
```

### In Node

```typescript
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'

async function loadPdfFromDisk(path: string): Promise<PDFDocument> {
  const bytes = await readFile(path)
  return PDFDocument.load(bytes)
}
```

---

## 2. Enumerate fields and discover name + type

After loading:

```typescript
const pdf = await loadPdfFromUrl('/templates/example.pdf')
const form = pdf.getForm()
const fields = form.getFields()
```

Each item is a **`PDFField`**. pdf-lib exposes concrete types you can distinguish with `instanceof`:

```typescript
import {
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from 'pdf-lib'

type FieldKind = 'text' | 'check' | 'dropdown' | 'radio' | 'other'

function describeField(field: import('pdf-lib').PDFField): {
  name: string
  kind: FieldKind
  readOnly: boolean
} {
  const name = field.getName()
  const readOnly = field.isReadOnly()

  if (field instanceof PDFTextField) {
    return { name, kind: 'text', readOnly }
  }
  if (field instanceof PDFCheckBox) {
    return { name, kind: 'check', readOnly }
  }
  if (field instanceof PDFDropdown) {
    return { name, kind: 'dropdown', readOnly }
  }
  if (field instanceof PDFRadioGroup) {
    return { name, kind: 'radio', readOnly }
  }
  return { name, kind: 'other', readOnly }
}

const summary = fields.map(describeField)
console.table(summary)
```

**Useful extras for text fields:**

```typescript
if (field instanceof PDFTextField) {
  const multiline = field.isMultiline()
  const maxLen = field.getMaxLength() // 0 often means “no limit”
}
```

**Dropdown / radio options** (for building UIs or validation):

```typescript
if (field instanceof PDFDropdown) {
  const options = field.getOptions()
}
if (field instanceof PDFRadioGroup) {
  const options = field.getOptions().map((o) => o.exportValue)
}
```

---

## 3. Use this inside React

Typical patterns:

1. **On mount or button click**: load PDF → compute `summary` → `setState` or `useMemo` after load.
2. **Show a dev panel**: render a table of `name`, `kind`, `readOnly` so authors can align API keys with real AcroForm names.
3. **Build-time script**: a small **Node** script that reads every template under a folder, writes `fields.json`. Your React app imports that JSON instead of parsing PDFs at runtime.

Avoid parsing huge PDFs on every keystroke; cache the result per file URL or hash.

---

## 4. Pitfalls

- **Field names** must match **exactly** when you fill later (including spaces). Prefer copying names from this enumeration output.
- **Order** of `getFields()` is defined by pdf-lib / PDF structure; do not assume it matches left-to-right reading order unless you verify.
- **Read-only** fields still appear here; skip them when generating input controls or when writing values.
- If you need **every** annotation on a page (not only AcroForm), pdf-lib is not a full parser; you'd combine with lower-level tools for advanced cases.

---

## Next step

Once you know each field’s **name** and **type**, you can fill the same PDF with arbitrary data; see the companion tutorial **“Fill a PDF form from arbitrary data (pdf-lib)”**.
