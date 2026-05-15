import { Download, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deleteFile, downloadFile, fetchFiles } from '../api'
import { useSession } from '../useSession'

function formatBytes(value) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / 1024 ** exponent
  return `${amount.toFixed(amount >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function FilesPage() {
  const { session } = useSession()
  const [files, setFiles] = useState([])
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    async function loadFiles() {
      const data = await fetchFiles(session.accessToken)
      setFiles(data)
    }

    void loadFiles()
  }, [session?.accessToken])

  async function handleDownload(file) {
    setBusyId(file.id)

    try {
      const blob = await downloadFile(session.accessToken, file.id)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.filename
      link.click()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(fileId) {
    setBusyId(fileId)

    try {
      await deleteFile(session.accessToken, fileId)
      const data = await fetchFiles(session.accessToken)
      setFiles(data)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="page-grid">
      <section className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">My Files</p>
            <h3>Protected file inventory</h3>
          </div>
        </div>

        <div className="stack-list">
          {files.length ? (
            files.map((file) => (
              <article className="list-row file-row" key={file.id}>
                <div>
                  <strong>{file.filename}</strong>
                  <span>
                    {formatDate(file.upload_date)} | {formatBytes(file.file_size)}
                  </span>
                  <div className="status-row">
                    <span className={`status-pill ${file.replication_status?.aws ? 'ok' : 'muted'}`}>
                      AWS
                    </span>
                    <span className={`status-pill ${file.replication_status?.gcp ? 'ok' : 'muted'}`}>
                      GCP
                    </span>
                    <span
                      className={`status-pill ${file.replication_status?.firebase ? 'ok' : 'muted'}`}
                    >
                      Firebase
                    </span>
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="ghost-button"
                    onClick={() => void handleDownload(file)}
                    disabled={busyId === file.id}
                    type="button"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    className="ghost-button danger"
                    onClick={() => void handleDelete(file.id)}
                    disabled={busyId === file.id}
                    type="button"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-card">No uploaded files yet.</div>
          )}
        </div>
      </section>
    </section>
  )
}

export default FilesPage
