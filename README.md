# PDF form prefiller

React (Vite + TypeScript) app that collects contract data in an HTML form and fills **AcroForm** text fields in a user-provided PDF. Filling runs **in the browser** with [pdf-lib](https://pdf-lib.js.org/).

## Contract PDFs

- The app no longer uses `.env` or bundled template PDFs.
- Users **upload a fillable PDF** in the UI; the app extracts its AcroForm field names and uses them as the canonical keys for form values.

---

## Run and test the app

### Prerequisites

- **Node.js** 20+ (or recent LTS) and **npm**

### Install

```bash
npm install
```

### Run locally (development)

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173/**). The app uses hash routing: the prefiller is at `/` and the field inspector at **`#/dev/fields`**.

### Manual QA (how to test)

1. **Upload** — Upload a fillable PDF (AcroForm).
2. **Fill** — Enter text (or use **Fill with random data**), then **Submit**.
3. **Download** — Click **Download filled PDF**; open it and confirm text appears in the intended fields.
4. **Inspector** — Go to **`#/dev/fields`** for the (now minimal) inspector page.

### Automated checks (no unit test suite yet)

```bash
npm run lint    # ESLint
npm run build   # TypeScript + production Vite build
```

To smoke-test the **production** bundle locally:

```bash
npm run build && npm run preview
```

Then open the printed URL and repeat the manual steps above.

### Other scripts

| Command | Purpose |
| ------- | ------- |
| *(none)* | *(no PDF dump script is required anymore)* |

---

## How PDF field updating works

### 1. Library and model

- Each template is a normal PDF with an AcroForm layer. **pdf-lib** parses the file and exposes `pdfDoc.getForm()` as a `PDFForm`.
- Text inputs are updated with:

  ```ts
  const form = pdfDoc.getForm()
  form.getTextField(acroFormName).setText(userString)
  form.updateFieldAppearances()
  ```

- `updateFieldAppearances()` asks pdf-lib to refresh field appearances so values show reliably in common viewers. If a field is not a text field or is incompatible, our code catches the error and skips that widget so one bad field does not abort the whole export.

*(Checkboxes, radio groups, and dropdowns would use `getCheckBox`, `getRadioGroup`, and `getDropdown` instead of `getTextField`; this project only implements **text** fields today.)*

### 2. Where templates live

Templates are provided by the user at runtime via the upload control in the UI.

### 3. Form `values` and “canonical” field names

React form state is a flat `Record<string, string>`. Keys are the **AcroForm field names** extracted from the uploaded PDF, in the order pdf-lib reports at upload time.

### 4. HTML form vs PDF

[`form-config.ts`](src/features/contract-prefiller/config/form-config.ts) defines which canonical keys appear in the UI for Local / International (`localOnlyKeys` / `internationalOnlyKeys`). Keys not shown still exist in the schema; submitting with empty strings yields empty PDF fields for those slots.

## Project layout (PDF-related)

| Path | Role |
| ---- | ---- |
| [`src/features/contract-prefiller/pdf/fillAcroForm.ts`](src/features/contract-prefiller/pdf/fillAcroForm.ts) | `getTextField` / `setText` / appearances |
| [`src/features/contract-prefiller/pdf/extractAcroForm.ts`](src/features/contract-prefiller/pdf/extractAcroForm.ts) | Extract AcroForm field names/metadata at upload time |
| [`src/features/contract-prefiller/pdf/generateFilledPdf.ts`](src/features/contract-prefiller/pdf/generateFilledPdf.ts) | Load bytes, fill, save |
| [`src/features/contract-prefiller/config/manifest.ts`](src/features/contract-prefiller/config/manifest.ts) | Runtime helpers for canonical order + field meta |
| [`src/features/contract-prefiller/config/form-config.ts`](src/features/contract-prefiller/config/form-config.ts) | UI field definitions |

General **pdf-lib** walkthroughs (not tied to this repo) live under [`docs/tutorials/`](docs/tutorials/).

## Risks (short)

- **Read-only** or non-text AcroForm fields may not update as expected.
- **Unicode / fonts** depend on fonts embedded in the template; pdf-lib can embed fonts for advanced cases.
- **XFA-only** or flattened-only PDFs may not expose standard AcroForm fields to pdf-lib.

For a longer risk list, see the original architecture plan in your repo/plans.
