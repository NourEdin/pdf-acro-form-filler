import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import { BranchSelector } from './BranchSelector'
import { ContractForm } from './ContractForm'
import { DownloadActions } from './DownloadActions'
import type { Branch } from '../types'

interface PairState {
  salalah: { fileName: string; blob: Blob }
  sifah: { fileName: string; blob: Blob }
}

export function ContractPrefillerApp() {
  const [branch, setBranch] = useState<Branch>('local')
  const [lastPair, setLastPair] = useState<PairState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Loads templates from `/contracts/…`, fills AcroForm text fields via pdf-lib, returns raw PDF bytes. */
  const onFormSubmit = useCallback(
    async (values: Record<string, string>) => {
      setBusy(true)
      setError(null)
      try {
        const { generateFilledPdfPair } = await import('../pdf/generateFilledPair')
        const { salalah, sifah } = await generateFilledPdfPair(branch, values)
        setLastPair({
          salalah: {
            fileName: salalah.fileName,
            blob: new Blob([new Uint8Array(salalah.bytes)], {
              type: 'application/pdf',
            }),
          },
          sifah: {
            fileName: sifah.fileName,
            blob: new Blob([new Uint8Array(sifah.bytes)], {
              type: 'application/pdf',
            }),
          },
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setLastPair(null)
      } finally {
        setBusy(false)
      }
    },
    [branch],
  )

  const downloadZip = useCallback(async () => {
    if (!lastPair) return
    const zip = new JSZip()
    zip.file(lastPair.salalah.fileName, lastPair.salalah.blob)
    zip.file(lastPair.sifah.fileName, lastPair.sifah.blob)
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = branch === 'local' ? 'local' : 'international'
    a.href = url
    a.download = `contracts-${slug}.zip`
    a.rel = 'noopener'
    a.click()
    URL.revokeObjectURL(url)
  }, [lastPair, branch])

  return (
    <div className="prefiller">
      <header className="prefiller-header">
        <h1>Contract PDF prefiller</h1>
        <p className="prefiller-lede">
          Choose Local or International, fill the form, then download filled
          Salalah Beach and Sifah contract PDFs.
        </p>
        <nav className="prefiller-nav">
          <Link to="/dev/fields">Field inspector (dev)</Link>
        </nav>
      </header>

      <BranchSelector value={branch} onChange={setBranch} disabled={busy} />

      <ContractForm
        branch={branch}
        onSubmit={onFormSubmit}
        isSubmitting={busy}
      />

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {lastPair ? (
        <DownloadActions
          salalah={lastPair.salalah}
          sifah={lastPair.sifah}
          onDownloadZip={downloadZip}
          zipDisabled={busy}
        />
      ) : null}
    </div>
  )
}
