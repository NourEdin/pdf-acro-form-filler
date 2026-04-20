interface DownloadActionsProps {
  onDownload: () => void
  disabled?: boolean
}

export function DownloadActions({
  onDownload,
  disabled,
}: Readonly<DownloadActionsProps>) {
  return (
    <div className="download-actions">
      <h2 className="download-heading">Download filled PDF</h2>
      <p className="download-hint">
        The PDF will be generated from your last submit.
      </p>
      <div className="download-buttons">
        <button
          type="button"
          className="btn primary"
          disabled={disabled}
          onClick={onDownload}
        >
          Download filled PDF
        </button>
      </div>
    </div>
  )
}
