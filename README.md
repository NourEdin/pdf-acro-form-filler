# PDF form prefiller

React (Vite + TypeScript) app that collects contract data in an HTML form and fills **AcroForm** text fields in two venue PDFs (**Salalah Beach** and **Sifah**) for either **Local** or **International** templates. Filling runs **in the browser** with [pdf-lib](https://pdf-lib.js.org/).

## Contract PDFs and `.env` (not in version control)

- **Binary PDF templates are gitignored** (`contracts/*.pdf`, `public/contracts/*.pdf`). Obtain them separately and add them locally.
- **Filenames** for those four templates are configured in **`.env`** (not committed). Copy **[`.env.example`](.env.example)** to **`.env`** and set the **`VITE_CONTRACT_PDF_*`** variables to the actual file names on disk (defaults in the example match the historical template names).
- Vite only exposes variables prefixed with **`VITE_`** to the app; the same keys are read by **`npm run dump:pdf-fields`** via `dotenv` in Node.
- Keep **`contracts/`** and **`public/contracts/`** in sync: the same four files (with the same names as in `.env`) should exist in both folders so (1) the dump script can read `contracts/` and (2) the dev server can serve `public/contracts/` at `/contracts/...`.

[`src/generated/acroform-manifest.json`](src/generated/acroform-manifest.json) lists AcroForm metadata per file; its `"file"` strings must **exactly match** the names in `.env`. After renaming templates, update `.env`, re-copy PDFs, run **`npm run dump:pdf-fields`**, and commit the updated manifest if you track it in git.

---

## Run and test the app

### Prerequisites

- **Node.js** 20+ (or recent LTS) and **npm**
- The four contract **`.pdf`** files available locally
- **`.env`** created from `.env.example` (required for `dev` / `build` / `dump:pdf-fields`)

### Install

```bash
npm install
cp .env.example .env
# Edit .env if your template file names differ from the example.
```

Place the PDFs in **`contracts/`** and **`public/contracts/`** using exactly those names.

### Regenerate manifest (after adding or changing templates)

```bash
npm run dump:pdf-fields
```

### Run locally (development)

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173/**). The app uses hash routing: the prefiller is at `/` and the field inspector at **`#/dev/fields`**.

### Manual QA (how to test)

1. **Branch** — Choose **Local** or **International**; the form should reflect your visibility rules in [`form-config.ts`](src/features/contract-prefiller/config/form-config.ts).
2. **Fill** — Enter text (or use **Fill with random data**), then **Submit and generate PDFs**.
3. **Downloads** — After a successful run, use **Download — Salalah Beach** and **Download — Sifah**; open both PDFs and confirm text appears in the intended fields.
4. **ZIP** — Use **Download ZIP (both)** and confirm both files are inside the archive.
5. **Inspector** — Go to **`#/dev/fields`** and confirm the slot/field table matches your expectations when templates change.
6. **Template churn** — When PDFs change, update **`contracts/`** and **`public/contracts/`**, run **`npm run dump:pdf-fields`**, and fix **`.env`** if filenames changed.

### Automated checks (no unit test suite yet)

```bash
npm run lint    # ESLint
npm run build   # TypeScript + production Vite build (needs .env)
```

To smoke-test the **production** bundle locally:

```bash
npm run build && npm run preview
```

Then open the printed URL and repeat the manual steps above.

### Other scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dump:pdf-fields` | Reads PDFs from `contracts/` using names in `.env`, writes [`src/generated/acroform-manifest.json`](src/generated/acroform-manifest.json) |

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

- **Authoritative copies** for the dump script: [`contracts/`](contracts/) (gitignored `*.pdf`).
- **Served to the browser**: [`public/contracts/`](public/contracts/) (gitignored `*.pdf`) — URLs like `/contracts/<encoded-filename>` (see [`templateUrl`](src/features/contract-prefiller/config/manifest.ts)).

### 3. Which file pair is filled

The user’s **Local | International** choice selects **two** files. Their names come from **`.env`**:

| Branch | Env var (Salalah) | Env var (Sifah) |
| ------ | ----------------- | --------------- |
| Local | `VITE_CONTRACT_PDF_SALALAH_LOCAL` | `VITE_CONTRACT_PDF_SIFAH_LOCAL` |
| International | `VITE_CONTRACT_PDF_SALALAH_INTERNATIONAL` | `VITE_CONTRACT_PDF_SIFAH_INTERNATIONAL` |

Implementation: [`generateFilledPair.ts`](src/features/contract-prefiller/pdf/generateFilledPair.ts) resolves filenames, loads both PDFs, applies values, then `save()`s each document to a `Uint8Array` for download.

### 4. Form `values` and “canonical” field names

React form state is a flat `Record<string, string>`. Keys are **AcroForm names** taken from the **international Salalah** template (whatever filename **`VITE_CONTRACT_PDF_SALALAH_INTERNATIONAL`** points to), in the order pdf-lib reports in the manifest — see [`salalahCanonicalFieldOrder`](src/features/contract-prefiller/config/manifest.ts).

Regenerate the manifest when PDFs change:

```bash
npm run dump:pdf-fields
```

The dump script ([`scripts/dump-pdf-fields.ts`](scripts/dump-pdf-fields.ts)) loads each configured PDF from `contracts/`, calls `getForm().getFields()`, and writes name, type, read-only, multiline, etc.

### 5. Why Salalah and Sifah are filled differently

**Salalah:** the AcroForm **names** and **order** match the canonical list for both local and international files (for the templates this project was built against). We write each value to the widget with the **same name** as the form key.

**Sifah:** AcroForm names (and sometimes order) **differ** from Salalah’s, but the PDFs still have the same **number** of logical slots. We assume **index *i*** on Salalah and **index *i*** on Sifah refer to the **same** box on the layout.

So for Sifah we:

1. Read ordered Sifah field names for the current branch from the manifest (`sifahFieldOrder`).
2. For each index `i`, take the user value under canonical key `salalahCanonicalFieldOrder[i]` and call `setText` on `sifahFieldOrder[i]`.

Details and inline notes: [`fillAcroForm.ts`](src/features/contract-prefiller/pdf/fillAcroForm.ts).

### 6. HTML form vs PDF

[`form-config.ts`](src/features/contract-prefiller/config/form-config.ts) defines which canonical keys appear in the UI for Local / International (`localOnlyKeys` / `internationalOnlyKeys`). Keys not shown still exist in the schema; submitting with empty strings yields empty PDF fields for those slots.

## Project layout (PDF-related)

| Path | Role |
| ---- | ---- |
| [`src/features/contract-prefiller/pdf/fillAcroForm.ts`](src/features/contract-prefiller/pdf/fillAcroForm.ts) | `getTextField` / `setText` / appearances |
| [`src/features/contract-prefiller/pdf/generateFilledPair.ts`](src/features/contract-prefiller/pdf/generateFilledPair.ts) | Pick pair, load, fill, save |
| [`src/features/contract-prefiller/config/manifest.ts`](src/features/contract-prefiller/config/manifest.ts) | Template names from `.env`, canonical order, URLs |
| [`src/features/contract-prefiller/config/form-config.ts`](src/features/contract-prefiller/config/form-config.ts) | UI field definitions |
| [`scripts/dump-pdf-fields.ts`](scripts/dump-pdf-fields.ts) | Manifest generator |
| [`.env.example`](.env.example) | Documented `VITE_CONTRACT_PDF_*` filenames |

General **pdf-lib** walkthroughs (not tied to this repo) live under [`docs/tutorials/`](docs/tutorials/).

## Risks (short)

- **Read-only** or non-text AcroForm fields may not update as expected.
- **Unicode / fonts** depend on fonts embedded in the template; pdf-lib can embed fonts for advanced cases.
- **XFA-only** or flattened-only PDFs may not expose standard AcroForm fields to pdf-lib.

For a longer risk list, see the original architecture plan in your repo/plans.
