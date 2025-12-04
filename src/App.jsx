import { useState, useEffect, useRef } from 'react'
import './App.css'
import ChatWindow from './components/ChatWindow'
import Calendar from './components/Calendar'
import Stats from './components/Stats'
import { uploadHybrid } from './utils/uploadHybrid'
import { Calendar as CalendarIcon, BarChart3, X } from 'lucide-react'

// Generate unique ID for each upload
const generateUploadId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
  const [uploadStatus, setUploadStatus] = useState('') // For error messages
  const [showChatOnUpload, setShowChatOnUpload] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [mouthOpen, setMouthOpen] = useState(false)

  // Multi-Upload State: Array of upload sessions
  const [uploads, setUploads] = useState([])
  const [activeUploadId, setActiveUploadId] = useState(null) // Which upload's chat is open
  const [generalChatMessages, setGeneralChatMessages] = useState([]) // For chat without upload
  const [celebratingUploadId, setCelebratingUploadId] = useState(null) // Which upload is celebrating

  // Abort controllers for each upload
  const abortControllersRef = useRef({})

  // Chat Webhook URL
  const CHAT_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/chat'

  // n8n Webhook URL - Production
  const N8N_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/video-upload'

  // Get active upload object
  const activeUpload = uploads.find(u => u.id === activeUploadId)

  // Auto-trigger post when any upload completes
  useEffect(() => {
    uploads.forEach(upload => {
      if (
        upload.state === 'complete' &&
        upload.videoId &&
        upload.readyToPost &&
        !upload.hasTriggeredAutoPost
      ) {
        console.log('[App] Auto-triggering post for upload:', upload.id)
        sendAutoPostTrigger(upload.id)
      }
    })
  }, [uploads])

  // Update a specific upload's state
  const updateUpload = (uploadId, updates) => {
    setUploads(prev => prev.map(u =>
      u.id === uploadId ? { ...u, ...updates } : u
    ))
  }

  // Send automatic post trigger to agent
  const sendAutoPostTrigger = async (uploadId) => {
    const upload = uploads.find(u => u.id === uploadId)
    if (!upload) return

    // Mark as triggered immediately to prevent double-triggers
    updateUpload(uploadId, { hasTriggeredAutoPost: true })

    try {
      const conversationHistory = upload.chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      console.log('[App] Sending auto-post trigger for:', upload.fileName)

      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[SYSTEM] Video-Upload abgeschlossen. video_id ist jetzt verfügbar. Bitte führe den Post jetzt aus wie besprochen.',
          video_id: upload.videoId,
          notion_page_id: upload.notionPageId,
          conversation_history: conversationHistory,
          upload_in_progress: false,
          auto_post_trigger: true
        })
      })

      const data = await response.json()
      console.log('[App] Auto-post trigger response:', data)

      if (data.success && data.response) {
        updateUpload(uploadId, {
          chatMessages: [
            ...upload.chatMessages,
            {
              role: 'user',
              content: '[Video-Upload abgeschlossen - automatisch gepostet]',
              timestamp: new Date(),
              isSystem: true
            },
            {
              role: 'assistant',
              content: data.response,
              timestamp: new Date()
            }
          ]
        })

        // Check if response indicates success and trigger celebration
        const responseText = data.response.toLowerCase()
        if (responseText.includes('erledigt') && responseText.includes('gepostet')) {
          console.log('[App] Success message detected! Triggering celebration for:', uploadId)
          setCelebratingUploadId(uploadId)

          // Reset celebration after 3 seconds
          setTimeout(() => {
            setCelebratingUploadId(null)
          }, 3000)
        }
      }
    } catch (error) {
      console.error('[App] Auto-post trigger error:', error)
    }
  }

  // Typewriter messages
  const typewriterMessages = [
    { title: 'Videos hochladen', subtitle: 'Am besten als MP4' },
    { title: 'Fragen? Chat oben rechts!', subtitle: 'Ich helfe dir gerne' },
  ]

  // Typewriter effect
  useEffect(() => {
    if (activeUploadId) return // Don't animate when chat is open

    const currentMessage = typewriterMessages[messageIndex]
    const fullText = `${currentMessage.title}\n${currentMessage.subtitle}`

    let timeout

    if (!isDeleting) {
      if (charIndex < fullText.length) {
        setMouthOpen(true)
        timeout = setTimeout(() => {
          setTypewriterText(fullText.substring(0, charIndex + 1))
          setCharIndex(charIndex + 1)
          setTimeout(() => setMouthOpen(false), 30)
        }, 50 + Math.random() * 30)
      } else {
        setMouthOpen(false)
        timeout = setTimeout(() => {
          setIsDeleting(true)
        }, 5000)
      }
    } else {
      setMouthOpen(false)
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setTypewriterText(fullText.substring(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        }, 25)
      } else {
        setIsDeleting(false)
        setMessageIndex((messageIndex + 1) % typewriterMessages.length)
      }
    }

    return () => clearTimeout(timeout)
  }, [charIndex, isDeleting, messageIndex, activeUploadId])

  // Erlaubte Video-Formate
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/mpeg'
  ]

  const isValidVideo = (file) => ALLOWED_VIDEO_TYPES.includes(file.type)

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
      startNewUpload(validFiles[0])
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const validFiles = selectedFiles.filter(file => isValidVideo(file))
    if (validFiles.length < selectedFiles.length) {
      setUploadStatus('Nur Video-Dateien werden akzeptiert')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    if (validFiles.length > 0) {
      startNewUpload(validFiles[0])
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const formatTimeRemaining = (seconds) => {
    if (seconds === null || seconds <= 0) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')} verbleibend`
    }
    return `${secs}s verbleibend`
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Start a new upload session
  const startNewUpload = async (file) => {
    const uploadId = generateUploadId()
    const startTime = Date.now()

    // Create new upload entry
    const newUpload = {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      state: 'uploading',
      progress: 0,
      estimatedTimeRemaining: null,
      startTime: startTime,
      videoId: null,
      videoUrl: null,
      notionPageId: null,
      chatMessages: [],
      readyToPost: false,
      hasTriggeredAutoPost: false
    }

    setUploads(prev => [...prev, newUpload])
    setActiveUploadId(uploadId)

    // Create abort controller for this upload
    abortControllersRef.current[uploadId] = new AbortController()

    try {
      const data = await uploadHybrid(
        file,
        N8N_WEBHOOK_URL,
        (progress) => {
          const elapsed = (Date.now() - startTime) / 1000
          let remaining = null
          if (progress > 5 && elapsed > 0) {
            const totalEstimated = (elapsed / progress) * 100
            remaining = totalEstimated - elapsed
          }
          updateUpload(uploadId, {
            progress,
            estimatedTimeRemaining: remaining
          })
        },
        abortControllersRef.current[uploadId].signal
      )

      // Upload complete!
      updateUpload(uploadId, {
        state: 'complete',
        progress: 100,
        estimatedTimeRemaining: null,
        videoId: data.video_id || null,
        videoUrl: data.video_url || null
      })

    } catch (error) {
      if (error.name === 'AbortError') {
        // Upload was cancelled - remove it
        setUploads(prev => prev.filter(u => u.id !== uploadId))
        if (activeUploadId === uploadId) {
          setActiveUploadId(null)
        }
      } else {
        console.error('Upload error:', error)
        updateUpload(uploadId, {
          state: 'error',
          error: error.message
        })
      }
    }

    // Cleanup abort controller
    delete abortControllersRef.current[uploadId]
  }

  // Cancel an upload
  const cancelUpload = (uploadId) => {
    if (abortControllersRef.current[uploadId]) {
      abortControllersRef.current[uploadId].abort()
    }
    setUploads(prev => prev.filter(u => u.id !== uploadId))
    if (activeUploadId === uploadId) {
      setActiveUploadId(null)
    }
  }

  // Remove completed/error upload from list
  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId))
    if (activeUploadId === uploadId) {
      setActiveUploadId(null)
    }
  }

  const handleCloseChat = () => {
    setActiveUploadId(null)
  }

  // Set chat messages for active upload
  const setActiveChatMessages = (messagesOrUpdater) => {
    if (!activeUploadId) return
    setUploads(prev => prev.map(u => {
      if (u.id !== activeUploadId) return u
      const newMessages = typeof messagesOrUpdater === 'function'
        ? messagesOrUpdater(u.chatMessages)
        : messagesOrUpdater
      return { ...u, chatMessages: newMessages }
    }))
  }

  // Set readyToPost for active upload
  const setActiveReadyToPost = (value) => {
    if (!activeUploadId) return
    updateUpload(activeUploadId, { readyToPost: value })
  }

  return (
    <div className="app">
      {/* Upload Status Boxes - shows all uploads when chat is closed */}
      {!activeUploadId && uploads.length > 0 && (
        <div className="uploads-sidebar">
          {uploads.map(upload => (
            <div
              key={upload.id}
              className={`upload-status-box ${upload.state}`}
              onClick={() => setActiveUploadId(upload.id)}
            >
              <div className="upload-status-box-icon">
                {upload.state === 'complete' ? '✅' : upload.state === 'error' ? '❌' : '📹'}
              </div>
              <div className="upload-status-box-content">
                <div className="upload-status-box-filename">{upload.fileName}</div>
                {upload.state === 'uploading' && (
                  <>
                    <div className="upload-status-box-progress">
                      <div
                        className="upload-status-box-progress-fill"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <div className="upload-status-box-text">
                      {upload.progress}% {formatTimeRemaining(upload.estimatedTimeRemaining) && `• ${formatTimeRemaining(upload.estimatedTimeRemaining)}`}
                    </div>
                  </>
                )}
                {upload.state === 'complete' && (
                  <div className="upload-status-box-text">Upload abgeschlossen!</div>
                )}
                {upload.state === 'error' && (
                  <div className="upload-status-box-text error">Fehler: {upload.error}</div>
                )}
              </div>
              <button
                className="upload-status-box-close"
                onClick={(e) => {
                  e.stopPropagation()
                  if (upload.state === 'uploading') {
                    cancelUpload(upload.id)
                  } else {
                    removeUpload(upload.id)
                  }
                }}
                title={upload.state === 'uploading' ? 'Upload abbrechen' : 'Entfernen'}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat Window for active upload */}
      {activeUploadId && activeUpload && (
        <ChatWindow
          videoId={activeUpload.videoId}
          notionPageId={activeUpload.notionPageId}
          onClose={handleCloseChat}
          uploadState={activeUpload.state}
          uploadProgress={activeUpload.progress}
          fileName={activeUpload.fileName}
          fileSize={activeUpload.fileSize}
          timeRemaining={formatTimeRemaining(activeUpload.estimatedTimeRemaining)}
          chatMessages={activeUpload.chatMessages}
          setChatMessages={setActiveChatMessages}
          readyToPost={activeUpload.readyToPost}
          setReadyToPost={setActiveReadyToPost}
          onCancelUpload={() => cancelUpload(activeUploadId)}
          canCancel={activeUpload.state === 'uploading'}
          shouldCelebrate={celebratingUploadId === activeUploadId}
        />
      )}

      {/* General Chat (no upload) */}
      {showChatOnUpload && (
        <ChatWindow
          videoId={null}
          notionPageId={null}
          onClose={() => setShowChatOnUpload(false)}
          uploadState="idle"
          uploadProgress={0}
          fileName=""
          fileSize={0}
          timeRemaining=""
          chatMessages={generalChatMessages}
          setChatMessages={setGeneralChatMessages}
          readyToPost={false}
          setReadyToPost={() => {}}
        />
      )}

      {showCalendar && (
        <Calendar onClose={() => setShowCalendar(false)} />
      )}
      {showStats && (
        <Stats onClose={() => setShowStats(false)} />
      )}

      {/* Mascot */}
      {!activeUploadId && <Mascot mouthOpen={mouthOpen} />}

      {/* Hands back parts - behind the box */}
      {!activeUploadId && (
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
        {!activeUploadId && (
        <>
        <div className="header">
          <div className="logo-header-row">
            <div className="logo">
              <span className="logo-accent">CODA</span> Marketing
            </div>
            <div className="header-buttons">
              <button
                className="stats-fab"
                onClick={() => setShowStats(true)}
                title="Statistiken anzeigen"
              >
                <BarChart3 size={20} />
              </button>
              <button
                className="calendar-fab"
                onClick={() => setShowCalendar(true)}
                title="Video Kalender öffnen"
              >
                <CalendarIcon size={20} />
              </button>
              <button
                className="chat-fab"
                onClick={() => setShowChatOnUpload(true)}
                title="Hast du Fragen? Chatte mit mir!"
              >
                💬
              </button>
            </div>
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

        {uploadStatus && (
          <div className={`status-message ${uploadStatus.includes('Fehler') || uploadStatus.includes('konfiguriere') ? 'error' : 'success'}`}>
            {uploadStatus}
          </div>
        )}
        </>
        )}
      </div>

      {/* Hands front parts - fingers in front of the box */}
      {!activeUploadId && (
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
