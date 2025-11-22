import { useState } from 'react'
import './App.css'

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // n8n Webhook URL - Replace this with your actual n8n webhook URL
  const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE'

  // Erlaubte Video-Formate (MP4 bevorzugt!)
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime', // .mov (nicht ideal, aber akzeptiert)
    'video/webm',
    'video/mpeg'
  ]

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const videoFiles = droppedFiles.filter(file => ALLOWED_VIDEO_TYPES.includes(file.type))
    const mp4Files = videoFiles.filter(file => file.type === 'video/mp4')

    if (videoFiles.length < droppedFiles.length) {
      setUploadStatus('Nur Video-Dateien bitte! Am besten MP4 😊')
      setTimeout(() => setUploadStatus(''), 3000)
    } else if (mp4Files.length < videoFiles.length) {
      setUploadStatus('Tipp: MP4 funktioniert am besten!')
      setTimeout(() => setUploadStatus(''), 4000)
    }

    setFiles(prev => [...prev, ...videoFiles])
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const videoFiles = selectedFiles.filter(file => ALLOWED_VIDEO_TYPES.includes(file.type))
    const mp4Files = videoFiles.filter(file => file.type === 'video/mp4')

    if (videoFiles.length < selectedFiles.length) {
      setUploadStatus('Nur Video-Dateien bitte! Am besten MP4 😊')
      setTimeout(() => setUploadStatus(''), 3000)
    } else if (mp4Files.length < videoFiles.length) {
      setUploadStatus('Tipp: MP4 funktioniert am besten!')
      setTimeout(() => setUploadStatus(''), 4000)
    }

    setFiles(prev => [...prev, ...videoFiles])
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) {
      setUploadStatus('Bitte wähle zuerst Videos aus')
      return
    }

    if (N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
      setUploadStatus('Bitte konfiguriere zuerst die n8n Webhook URL in src/App.jsx')
      return
    }

    setIsUploading(true)
    setUploadStatus('Upload läuft...')

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size)
      formData.append('mimeType', file.type)

      try {
        // Upload to n8n webhook
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 'Erfolgreich'
          }))
        } else {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 'Fehler'
          }))
        }
      } catch (error) {
        console.error('Upload error:', error)
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 'Fehler'
        }))
      }
    }

    setIsUploading(false)
    setUploadStatus('Upload abgeschlossen!')
  }

  const clearAll = () => {
    setFiles([])
    setUploadProgress({})
    setUploadStatus('')
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="logo">
            <span className="logo-accent">CODA</span> Marketing Video Upload
          </div>
          <h1>Corn. Lade hier einfach die Videos hoch</h1>
          <p className="subtitle">
            Am besten als <strong>MP4</strong> - dann klappt's am sichersten! 🎬
          </p>
        </div>

        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="dropzone-content">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="dropzone-text">
              Video hier reinziehen oder klicken
            </p>
            <p className="dropzone-hint">
              Bitte <strong>MP4</strong> verwenden! (MOV & Co. machen manchmal Probleme 😅)
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="files-list">
            <div className="files-header">
              <h3>Ausgewählte Videos ({files.length})</h3>
              <button className="clear-btn" onClick={clearAll} disabled={isUploading}>
                Alle entfernen
              </button>
            </div>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <div className="file-actions">
                  {uploadProgress[file.name] && (
                    <span className={`status ${uploadProgress[file.name].toLowerCase()}`}>
                      {uploadProgress[file.name]}
                    </span>
                  )}
                  <button
                    className="remove-btn"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <button className="upload-btn" onClick={uploadFiles} disabled={isUploading}>
            {isUploading ? 'Upload läuft...' : `${files.length} ${files.length === 1 ? 'Video' : 'Videos'} hochladen`}
          </button>
        )}

        {uploadStatus && (
          <div className={`status-message ${uploadStatus.includes('Fehler') || uploadStatus.includes('konfiguriere') ? 'error' : 'success'}`}>
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
