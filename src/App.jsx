import { useState, useEffect } from 'react'
import './App.css'
import ChatWindow from './components/ChatWindow'

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [currentView, setCurrentView] = useState('upload') // 'upload', 'loading', 'success', 'chat'
  const [videoId, setVideoId] = useState(null)
  const [notionPageId, setNotionPageId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0) // 0: upload, 1: AI, 2: database

  // n8n Webhook URL - Production
  const N8N_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/video-upload'

  // Erlaubte Video-Formate (MP4 bevorzugt!)
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime', // .mov (nicht ideal, aber akzeptiert)
    'video/webm',
    'video/mpeg'
  ]

  // Erlaubte Bild-Formate für Thumbnails
  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]

  // Helper function to check if file is image or video
  const getFileType = (file) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.type)) return 'video'
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'image'
    return 'unknown'
  }

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
    const validFiles = droppedFiles.filter(file => getFileType(file) !== 'unknown')
    const videoFiles = validFiles.filter(file => getFileType(file) === 'video')
    const imageFiles = validFiles.filter(file => getFileType(file) === 'image')
    const mp4Files = videoFiles.filter(file => file.type === 'video/mp4')

    if (validFiles.length < droppedFiles.length) {
      setUploadStatus('Nur Videos & Thumbnails bitte! 😊')
      setTimeout(() => setUploadStatus(''), 3000)
    } else if (videoFiles.length > 0 && mp4Files.length < videoFiles.length) {
      setUploadStatus('Tipp: MP4 funktioniert am besten!')
      setTimeout(() => setUploadStatus(''), 4000)
    }

    setFiles(prev => [...prev, ...validFiles])
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const validFiles = selectedFiles.filter(file => getFileType(file) !== 'unknown')
    const videoFiles = validFiles.filter(file => getFileType(file) === 'video')
    const imageFiles = validFiles.filter(file => getFileType(file) === 'image')
    const mp4Files = videoFiles.filter(file => file.type === 'video/mp4')

    if (validFiles.length < selectedFiles.length) {
      setUploadStatus('Nur Videos & Thumbnails bitte! 😊')
      setTimeout(() => setUploadStatus(''), 3000)
    } else if (videoFiles.length > 0 && mp4Files.length < videoFiles.length) {
      setUploadStatus('Tipp: MP4 funktioniert am besten!')
      setTimeout(() => setUploadStatus(''), 4000)
    }

    setFiles(prev => [...prev, ...validFiles])
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
      setUploadStatus('Bitte wähle zuerst Dateien aus')
      return
    }

    if (N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
      setUploadStatus('Bitte konfiguriere zuerst die n8n Webhook URL in src/App.jsx')
      return
    }

    // Switch to loading view
    setCurrentView('loading')
    setIsUploading(true)
    setCurrentStep(0)
    setUploadStatus('Upload läuft...')

    let lastVideoId = null
    let lastNotionPageId = null

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size)
      formData.append('mimeType', file.type)
      formData.append('fileType', getFileType(file)) // 'video' or 'image'

      try {
        // Step 0: Upload started
        setCurrentStep(0)

        // Upload to n8n webhook
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          // Step 1: AI processing (simulate delay for AI description)
          setCurrentStep(1)

          const data = await response.json()

          // Step 2: Database entry
          setCurrentStep(2)

          // Store video_id and notion_page_id from response
          if (data.video_id) {
            lastVideoId = data.video_id
          }
          if (data.notion_page_id) {
            lastNotionPageId = data.notion_page_id
          }

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

    // Step 3: Complete
    setCurrentStep(3)

    setIsUploading(false)
    setUploadStatus('Upload abgeschlossen!')

    // Store the IDs for chat
    if (lastVideoId) {
      setVideoId(lastVideoId)
    }
    if (lastNotionPageId) {
      setNotionPageId(lastNotionPageId)
    }

    // Small delay before switching to chat
    await new Promise(resolve => setTimeout(resolve, 800))

    // Switch to chat view after upload completes (instead of success)
    setCurrentView('chat')
  }

  const clearAll = () => {
    setFiles([])
    setUploadProgress({})
    setUploadStatus('')
  }

  const resetUpload = () => {
    setCurrentView('upload')
    setFiles([])
    setUploadProgress({})
    setUploadStatus('')
    setIsUploading(false)
    setVideoId(null)
    setNotionPageId(null)
  }

  const handleCloseChat = () => {
    // When closing chat, show success view
    setCurrentView('success')
  }

  // Loading View Component with Steps
  const LoadingView = () => {
    const steps = [
      { id: 0, label: 'Video wird hochgeladen', icon: '📤' },
      { id: 1, label: 'Video wird durch KI beschrieben', icon: '🤖' },
      { id: 2, label: 'Video wird in die Datenbank eingetragen', icon: '💾' },
      { id: 3, label: 'Fertig!', icon: '✅' }
    ]

    return (
      <div className="loading-view">
        <div className="loading-steps-container">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`loading-step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
            >
              <div className="loading-step-icon">
                {currentStep === step.id ? (
                  <div className="spinner-circle"></div>
                ) : currentStep > step.id ? (
                  <div className="checkmark">✓</div>
                ) : (
                  <div className="step-number">{step.id + 1}</div>
                )}
              </div>
              <div className="loading-step-content">
                <div className="loading-step-emoji">{step.icon}</div>
                <p className="loading-step-label">{step.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="loading-files-info">
          <p className="loading-files-count">
            {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} werden verarbeitet
          </p>
        </div>
      </div>
    )
  }

  // Success View Component
  const SuccessView = () => (
    <div className="success-view">
      <div className="success-animation">
        <div className="success-checkmark">
          <svg viewBox="0 0 52 52">
            <circle className="success-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path className="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
      </div>
      <h2 className="success-title">Hey Kornelios, Upload erfolgreich!</h2>
      <p className="success-text">Perfekt! Deine Videos werden jetzt verarbeitet.</p>
      <div className="success-telegram">
        <div className="telegram-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
        </div>
        <p className="telegram-text">
          Schau auf <strong>Telegram</strong> - wir haben dir eine Nachricht geschickt!
        </p>
      </div>
      <button className="success-btn" onClick={resetUpload}>
        Weitere Videos hochladen
      </button>
    </div>
  )

  return (
    <div className="app">
      {currentView === 'chat' && videoId && (
        <ChatWindow
          videoId={videoId}
          notionPageId={notionPageId}
          onClose={handleCloseChat}
        />
      )}
      <div className="container">{currentView === 'loading' && <LoadingView />}
        {currentView === 'success' && <SuccessView />}
        {currentView === 'upload' && (
        <>
        <div className="header">
          <div className="logo">
            <span className="logo-accent">CODA</span> Marketing Video Upload
          </div>
          <h1>Corn. Lade hier einfach die Videos & Thumbnails hoch</h1>
          <p className="subtitle">
            Videos am besten als <strong>MP4</strong> - Thumbnails als <strong>JPG/PNG</strong>! 🎬🖼️
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
            accept="video/*,image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="dropzone-content">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="dropzone-text">
              Videos & Thumbnails hier reinziehen oder klicken
            </p>
            <p className="dropzone-hint">
              Videos: <strong>MP4</strong> bevorzugt! | Thumbnails: <strong>JPG/PNG</strong> 😊
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="files-list">
            <div className="files-header">
              <h3>Ausgewählte Dateien ({files.length})</h3>
              <button className="clear-btn" onClick={clearAll} disabled={isUploading}>
                Alle entfernen
              </button>
            </div>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-name">
                    {getFileType(file) === 'image' ? '🖼️ ' : '🎬 '}
                    {file.name}
                  </span>
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
            {isUploading ? 'Upload läuft...' : `${files.length} ${files.length === 1 ? 'Datei' : 'Dateien'} hochladen`}
          </button>
        )}

        {uploadStatus && (
          <div className={`status-message ${uploadStatus.includes('Fehler') || uploadStatus.includes('konfiguriere') ? 'error' : 'success'}`}>
            {uploadStatus}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

export default App
