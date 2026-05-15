import { CloudUpload, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { uploadFile } from '../api'
import { useSession } from '../useSession'

function UploadPage() {
  const { session } = useSession()
  const [selectedFile, setSelectedFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (!selectedFile) {
      setMessage('Choose a file before uploading.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const result = await uploadFile(session.accessToken, selectedFile, (percent) => {
        setProgress(percent)
      })
      setMessage(result.message || 'Backup uploaded successfully.')
      setSelectedFile(null)
      setProgress(100)
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Upload failed.')
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-grid">
      <div className="panel page-panel">
        <div className="panel-heading">
          <div>
            <p className="page-kicker">Upload backup</p>
            <h3>Encrypt and replicate a new file</h3>
          </div>
        </div>

        <form className="upload-card" onSubmit={handleSubmit}>
          <label className="drop-field">
            <input
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              disabled={loading}
            />
            <span>{selectedFile ? selectedFile.name : 'Select a file to protect'}</span>
            <small>AES-256 encryption is applied before storage.</small>
          </label>

          <div className="progress-shell">
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>

          {message ? <div className="inline-message info">{message}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <CloudUpload size={16} />}
            {loading ? 'Uploading...' : 'Upload Backup'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default UploadPage
