interface DownloadActionsProps {
  salalah: { fileName: string; blob: Blob }
  sifah: { fileName: string; blob: Blob }
  onDownloadZip?: () => void
  zipDisabled?: boolean
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

export function DownloadActions({
  salalah,
  sifah,
  onDownloadZip,
  zipDisabled,
}: DownloadActionsProps) {
  return (
    <div className="download-actions">
      <h2 className="download-heading">Download filled contracts</h2>
      <p className="download-hint">
        Both PDFs were generated from your last submit.
      </p>
      <div className="download-buttons">
        <button
          type="button"
          className="btn primary"
          onClick={() => triggerDownload(salalah.blob, salalah.fileName)}
        >
          Download — Salalah Beach
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => triggerDownload(sifah.blob, sifah.fileName)}
        >
          Download — Sifah
        </button>
        {onDownloadZip ? (
          <button
            type="button"
            className="btn secondary"
            disabled={zipDisabled}
            onClick={onDownloadZip}
          >
            Download ZIP (both)
          </button>
        ) : null}
      </div>
    </div>
  )
}
