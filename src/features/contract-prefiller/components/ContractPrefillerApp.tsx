import { useCallback, useMemo, useState } from 'react'
import { ContractForm } from './ContractForm'
import { DownloadActions } from './DownloadActions'
import { buildFieldDefinitions } from '../config/form-config'
import { fieldMetaFromExtracted } from '../config/manifest'
import { extractAcroFormManifest } from '../pdf/extractAcroForm'

interface UploadState {
  file: File
  bytes: ArrayBuffer
  extracted: Awaited<ReturnType<typeof extractAcroFormManifest>>
}

export function ContractPrefillerApp() {
  const [upload, setUpload] = useState<UploadState | null>(null)
  const [lastValues, setLastValues] = useState<Record<string, string> | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFormSubmit = useCallback(
    async (values: Record<string, string>) => {
      setLastValues(values)
    },
    [],
  )

  const meta = useMemo(() => {
    return upload ? fieldMetaFromExtracted(upload.extracted.fields) : new Map()
  }, [upload])

  const fieldDefinitions = useMemo(() => {
    return upload ? buildFieldDefinitions(upload.extracted.canonicalOrder, meta) : []
  }, [upload, meta])

  const onPickFile = useCallback(
    async (file: File | null) => {
      setError(null)
      setLastValues(null)
      if (!file) {
        setUpload(null)
        return
      }
      setBusy(true)
      try {
        const bytes = await file.arrayBuffer()
        const extracted = await extractAcroFormManifest(bytes)
        setUpload({ file, bytes, extracted })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setUpload(null)
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const onDownload = useCallback(async () => {
    if (!upload || !lastValues) return
    setBusy(true)
    setError(null)
    try {
      const { generateFilledPdf } = await import('../pdf/generateFilledPdf')
      const bytes = await generateFilledPdf({
        templateBytes: upload.bytes,
        values: lastValues,
        canonicalOrder: upload.extracted.canonicalOrder,
      })
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = upload.file.name.replace(/\.pdf$/i, '') + '-filled.pdf'
      a.rel = 'noopener'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }, [upload, lastValues])

  return (
    <div className="prefiller">
      <header className="prefiller-header">
        <h1>Contract PDF prefiller</h1>
        <p className="prefiller-lede">
          Upload a PDF, fill the form, then download the filled PDF.
        </p>
      </header>

      <section className="upload-card">
        <label className="form-label" htmlFor="pdf-upload">
          PDF template
        </label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf,.pdf"
          className="form-input"
          disabled={busy}
          onChange={(e) => onPickFile(e.target.files?.item(0) ?? null)}
        />
        {upload ? (
          <p className="form-meta">
            Detected {upload.extracted.fields.length} fields in{' '}
            <code>{upload.file.name}</code>.
          </p>
        ) : (
          <p className="form-meta">Upload a fillable PDF (AcroForm).</p>
        )}
      </section>

      <ContractForm
        branch="local"
        onSubmit={onFormSubmit}
        isSubmitting={busy}
        fieldDefinitions={fieldDefinitions}
        canonicalCount={upload?.extracted.canonicalOrder.length ?? 0}
      />

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {upload ? (
        <DownloadActions
          onDownload={onDownload}
          disabled={busy || !lastValues}
        />
      ) : null}
    </div>
  )
}
