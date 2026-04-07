# PDF form prefiller

React (Vite + TypeScript) app that collects contract data in an HTML form and fills **AcroForm** text fields in two venue PDFs (**Salalah Beach** and **Sifah**) for either **Local** or **International** templates. Filling runs **in the browser** with [pdf-lib](https://pdf-lib.js.org/).

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

- Source PDFs: [`contracts/`](contracts/) (authoritative copies).
- App loads from **`public/contracts/`** — static URLs like `/contracts/Salalah%20Beach%20%5Blocal%5D.pdf` (see [`templateUrl`](src/features/contract-prefiller/config/manifest.ts)). After editing templates in `contracts/`, copy them into `public/contracts/` again (or automate that in your build).

### 3. Which file pair is filled

The user’s **Local | International** choice selects **two** files:

| Branch          | Salalah template                     | Sifah template              |
| --------------- | ------------------------------------ | --------------------------- |
| Local           | `Salalah Beach [local].pdf`          | `Sifah [local].pdf`         |
| International   | `Salalah Beach [international].pdf`   | `Sifah [international].pdf` |

Implementation: [`generateFilledPair.ts`](src/features/contract-prefiller/pdf/generateFilledPair.ts) resolves filenames, loads both PDFs, applies values, then `save()`s each document to a `Uint8Array` for download.

### 4. Form `values` and “canonical” field names

React form state is a flat `Record<string, string>`. Keys are **AcroForm names** taken from **Salalah Beach [international]** in the order pdf-lib reports them — the **canonical order** — see [`salalahCanonicalFieldOrder`](src/features/contract-prefiller/config/manifest.ts).

That list comes from the build-time manifest [`src/generated/acroform-manifest.json`](src/generated/acroform-manifest.json). Regenerate it whenever PDFs change:

```bash
npm run dump:pdf-fields
```

The dump script ([`scripts/dump-pdf-fields.ts`](scripts/dump-pdf-fields.ts)) opens each PDF in `contracts/`, calls `getForm().getFields()`, and writes name, type, read-only, multiline, etc.

### 5. Why Salalah and Sifah are filled differently

**Salalah (local and, in this repo, international):** the AcroForm **names** and **order** match the canonical list. We write each value to the widget with the **same name** as the form key.

**Sifah:** AcroForm names (and sometimes order) **differ** from Salalah’s, but the PDFs still have the same **number** of logical slots. We assume **index *i*** on Salalah and **index *i*** on Sifah refer to the **same** box on the layout.

So for Sifah we:

1. Read ordered Sifah field names for the current branch from the manifest (`sifahFieldOrder`).
2. For each index `i`, take the user value under canonical key `salalahCanonicalFieldOrder[i]` and call `setText` on `sifahFieldOrder[i]`.

Details and inline notes: [`fillAcroForm.ts`](src/features/contract-prefiller/pdf/fillAcroForm.ts).

### 6. HTML form vs PDF

[`form-config.ts`](src/features/contract-prefiller/config/form-config.ts) defines which canonical keys appear in the UI for Local / International (`localOnlyKeys` / `internationalOnlyKeys`). Keys not shown still exist in the schema; submitting with empty strings yields empty PDF fields for those slots.

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run dump:pdf-fields` | Refresh `src/generated/acroform-manifest.json` from `contracts/` |

## Project layout (PDF-related)

| Path | Role |
| ---- | ---- |
| [`src/features/contract-prefiller/pdf/fillAcroForm.ts`](src/features/contract-prefiller/pdf/fillAcroForm.ts) | `getTextField` / `setText` / appearances |
| [`src/features/contract-prefiller/pdf/generateFilledPair.ts`](src/features/contract-prefiller/pdf/generateFilledPair.ts) | Pick pair, load, fill, save |
| [`src/features/contract-prefiller/config/manifest.ts`](src/features/contract-prefiller/config/manifest.ts) | Canonical order, template URLs |
| [`src/features/contract-prefiller/config/form-config.ts`](src/features/contract-prefiller/config/form-config.ts) | UI field definitions |
| [`scripts/dump-pdf-fields.ts`](scripts/dump-pdf-fields.ts) | Manifest generator |

## Risks (short)

- **Read-only** or non-text AcroForm fields may not update as expected.
- **Unicode / fonts** depend on fonts embedded in the template; pdf-lib can embed fonts for advanced cases.
- **XFA-only** or flattened-only PDFs may not expose standard AcroForm fields to pdf-lib.

For a longer risk list, see the original architecture plan in your repo/plans.
