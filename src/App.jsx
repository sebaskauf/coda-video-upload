import { useState, useEffect } from 'react'
import './App.css'
import ChatWindow from './components/ChatWindow'
import { uploadFile } from './utils/uploadChunked'

// Mascot Component - Defined outside App to prevent re-renders
const Mascot = ({ mouthOpen }) => (
  <div className="mascot-container">
    {/* Main Mascot Head */}
    <svg className="mascot" viewBox="0 0 400 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head - wide half-circle sitting on top of box */}
      <ellipse cx="200" cy="120" rx="140" ry="100" fill="url(#mascotGradient)" />

      {/* Eyes - white only, animated */}
      <ellipse cx="150" cy="85" rx="18" ry="22" fill="white" className="mascot-eye mascot-eye-left" />
      <ellipse cx="250" cy="85" rx="18" ry="22" fill="white" className="mascot-eye mascot-eye-right" />

      {/* Mouth - opens and closes per character */}
      <ellipse
        cx="200"
        cy="135"
        rx="15"
        ry={mouthOpen ? "12" : "5"}
        fill="white"
        className="mascot-mouth"
      />

      {/* Gradient Definition */}
      <defs>
        <linearGradient id="mascotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b00" />
          <stop offset="50%" stopColor="#ff8533" />
          <stop offset="100%" stopColor="#ff6b00" />
        </linearGradient>
      </defs>
    </svg>
  </div>
)

function App() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [currentView, setCurrentView] = useState('upload') // 'upload', 'loading', 'success', 'chat'
  const [videoId, setVideoId] = useState(null)
  const [notionPageId, setNotionPageId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0) // 0: upload, 1: AI, 2: database, 3: preparing, 4: complete
  const [showChatOnUpload, setShowChatOnUpload] = useState(false)
  const [newFileIndex, setNewFileIndex] = useState(null)
  const [typewriterText, setTypewriterText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [mouthOpen, setMouthOpen] = useState(false)

  // Typewriter messages - title and subtitle pairs
  const typewriterMessages = [
    { title: 'Videos hochladen', subtitle: 'Am besten als MP4' },
    { title: 'Fragen? Chat oben rechts!', subtitle: 'Ich helfe dir gerne' },
  ]

  // Typewriter effect
  useEffect(() => {
    if (currentView !== 'upload') return

    const currentMessage = typewriterMessages[messageIndex]
    const fullText = `${currentMessage.title}\n${currentMessage.subtitle}`

    let timeout

    if (!isDeleting) {
      // Typing
      if (charIndex < fullText.length) {
        // Open mouth for each character
        setMouthOpen(true)
        timeout = setTimeout(() => {
          setTypewriterText(fullText.substring(0, charIndex + 1))
          setCharIndex(charIndex + 1)
          // Close mouth after character is typed
          setTimeout(() => setMouthOpen(false), 30)
        }, 50 + Math.random() * 30) // Slightly random for chunky feel
      } else {
        // Finished typing, wait then start deleting
        setMouthOpen(false)
        timeout = setTimeout(() => {
          setIsDeleting(true)
        }, 5000)
      }
    } else {
      // Deleting - mouth stays closed
      setMouthOpen(false)
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setTypewriterText(fullText.substring(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        }, 25) // Faster deletion
      } else {
        // Finished deleting, move to next message
        setIsDeleting(false)
        setMessageIndex((messageIndex + 1) % typewriterMessages.length)
      }
    }

    return () => clearTimeout(timeout)
  }, [charIndex, isDeleting, messageIndex, currentView])

  // n8n Webhook URL - Production
  const N8N_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/video-upload'

  // Erlaubte Video-Formate (MP4 bevorzugt!)
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime', // .mov (nicht ideal, aber akzeptiert)
    'video/webm',
    'video/mpeg'
  ]

  // Helper function to check if file is video
  const isValidVideo = (file) => {
    return ALLOWED_VIDEO_TYPES.includes(file.type)
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
    const validFiles = droppedFiles.filter(file => isValidVideo(file))
    if (validFiles.length < droppedFiles.length) {
      setUploadStatus('Nur Video-Dateien werden akzeptiert')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    if (validFiles.length > 0) {
      const currentLength = files.length
      setNewFileIndex(currentLength)
      setTimeout(() => setNewFileIndex(null), 1200)
    }

    setFiles(prev => [...prev, ...validFiles])
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const validFiles = selectedFiles.filter(file => isValidVideo(file))
    if (validFiles.length < selectedFiles.length) {
      setUploadStatus('Nur Video-Dateien werden akzeptiert')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    if (validFiles.length > 0) {
      const currentLength = files.length
      setNewFileIndex(currentLength)
      setTimeout(() => setNewFileIndex(null), 1200)
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
      setUploadStatus('Bitte wähle zuerst Videos aus')
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

      try {
        // Use robust upload function with retry logic and progress tracking
        const data = await uploadFile(
          file,
          N8N_WEBHOOK_URL,
          (progress) => {
            console.log(`[${file.name}] Progress: ${progress}%`)
          }
        )

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
      } catch (error) {
        console.error('Upload error:', error)
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 'Fehler'
        }))
      }
    }

    // Upload complete!
    setCurrentStep(1)

    setIsUploading(false)
    setUploadStatus('Upload abgeschlossen!')

    // Store the IDs for chat
    if (lastVideoId) {
      setVideoId(lastVideoId)
    }
    if (lastNotionPageId) {
      setNotionPageId(lastNotionPageId)
    }

    // Short delay to show success animation
    await new Promise(resolve => setTimeout(resolve, 800))

    // Switch to chat view after upload completes
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
    // When closing chat, go back to upload view
    resetUpload()
  }

  // Loading View Component - Advanced and cool
  const LoadingView = () => {
    return (
      <div className="loading-view">
        <div className="loading-background-effects">
          <div className="loading-particle particle-1"></div>
          <div className="loading-particle particle-2"></div>
          <div className="loading-particle particle-3"></div>
          <div className="loading-particle particle-4"></div>
          <div className="loading-glow"></div>
        </div>

        {currentStep === 0 ? (
          <>
            <div className="loading-orb-container">
              <div className="loading-orb">
                <div className="loading-orb-ring ring-1"></div>
                <div className="loading-orb-ring ring-2"></div>
                <div className="loading-orb-ring ring-3"></div>
                <div className="loading-orb-core">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
              </div>
              <div className="loading-progress-ring">
                <svg viewBox="0 0 100 100">
                  <circle className="progress-bg" cx="50" cy="50" r="45" />
                  <circle className="progress-bar" cx="50" cy="50" r="45" />
                </svg>
              </div>
            </div>

            <div className="loading-status">
              <h2 className="loading-title">Wird verarbeitet</h2>
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>

            <p className="loading-file-info">
              {files.length} {files.length === 1 ? 'Video' : 'Videos'}
            </p>
          </>
        ) : (
          <>
            <div className="loading-success-burst">
              <div className="burst-ring ring-1"></div>
              <div className="burst-ring ring-2"></div>
              <div className="burst-ring ring-3"></div>
              <div className="success-orb">
                <svg className="success-check" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
            </div>
            <h2 className="loading-title success">Fertig!</h2>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      {currentView === 'chat' && videoId && (
        <ChatWindow
          videoId={videoId}
          notionPageId={notionPageId}
          onClose={handleCloseChat}
        />
      )}
      {showChatOnUpload && (
        <ChatWindow
          videoId={null}
          notionPageId={null}
          onClose={() => setShowChatOnUpload(false)}
        />
      )}
      {/* Mascot - Remove this line and the Mascot component if not needed */}
      {currentView === 'upload' && <Mascot mouthOpen={mouthOpen} />}

      {/* Hands back parts - behind the box */}
      {currentView === 'upload' && (
        <>
          <div className="mascot-hand mascot-hand-left mascot-hand-back">
            <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="40" cy="55" rx="32" ry="28" fill="url(#pawGradientLeftBack)" />
              <defs>
                <linearGradient id="pawGradientLeftBack" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b00" />
                  <stop offset="50%" stopColor="#ff8533" />
                  <stop offset="100%" stopColor="#ff6b00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="mascot-hand mascot-hand-right mascot-hand-back">
            <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="40" cy="55" rx="32" ry="28" fill="url(#pawGradientRightBack)" />
              <defs>
                <linearGradient id="pawGradientRightBack" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b00" />
                  <stop offset="50%" stopColor="#ff8533" />
                  <stop offset="100%" stopColor="#ff6b00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}

      <div className="container">
        {currentView === 'loading' && <LoadingView />}
        {currentView === 'upload' && (
        <>
        <div className="header">
          <div className="logo-header-row">
            <div className="logo">
              <span className="logo-accent">CODA</span> Marketing
            </div>
            <button
              className="chat-fab"
              onClick={() => setShowChatOnUpload(true)}
              title="Hast du Fragen? Chatte mit mir!"
            >
              💬
            </button>
          </div>
          <div className="typewriter-container">
            <h1 className="typewriter-title">
              {typewriterText.split('\n')[0]}
              {!typewriterText.includes('\n') && <span className="typewriter-cursor">▌</span>}
            </h1>
            <p className="subtitle typewriter-subtitle">
              {typewriterText.split('\n')[1] || ''}
              {typewriterText.includes('\n') && <span className="typewriter-cursor">▌</span>}
            </p>
          </div>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="dropzone-text">
              Videos hier reinziehen oder klicken
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
              <div key={index} className={`file-item ${index === newFileIndex ? 'file-item-new' : ''}`}>
                {index === newFileIndex && (
                  <div className="file-item-check-overlay">
                    <svg className="file-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                )}
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
        </>
        )}
      </div>

      {/* Hands front parts - fingers in front of the box */}
      {currentView === 'upload' && (
        <>
          <div className="mascot-hand mascot-hand-left mascot-hand-front">
            <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="38" r="14" fill="url(#pawGradientLeftFront)" />
              <circle cx="38" cy="28" r="13" fill="url(#pawGradientLeftFront)" />
              <circle cx="58" cy="38" r="14" fill="url(#pawGradientLeftFront)" />
              <defs>
                <linearGradient id="pawGradientLeftFront" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b00" />
                  <stop offset="50%" stopColor="#ff8533" />
                  <stop offset="100%" stopColor="#ff6b00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="mascot-hand mascot-hand-right mascot-hand-front">
            <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="38" r="14" fill="url(#pawGradientRightFront)" />
              <circle cx="42" cy="28" r="13" fill="url(#pawGradientRightFront)" />
              <circle cx="62" cy="38" r="14" fill="url(#pawGradientRightFront)" />
              <defs>
                <linearGradient id="pawGradientRightFront" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b00" />
                  <stop offset="50%" stopColor="#ff8533" />
                  <stop offset="100%" stopColor="#ff6b00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}
    </div>
  )
}

export default App
