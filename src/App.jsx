import { useState, useEffect, useRef } from 'react'
import './App.css'
import ChatWindow from './components/ChatWindow'
import Calendar from './components/Calendar'
import Stats from './components/Stats'
import { uploadHybrid } from './utils/uploadHybrid'
import { Calendar as CalendarIcon, BarChart3 } from 'lucide-react'

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
  const [uploadStatus, setUploadStatus] = useState('') // For error messages
  const [currentView, setCurrentView] = useState('upload') // 'upload', 'chat'
  const [videoId, setVideoId] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [notionPageId, setNotionPageId] = useState(null)
  const [showChatOnUpload, setShowChatOnUpload] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [mouthOpen, setMouthOpen] = useState(false)

  // Parallel Upload State
  const [uploadState, setUploadState] = useState('idle') // 'idle' | 'uploading' | 'complete' | 'error'
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null)
  const [currentFileName, setCurrentFileName] = useState('')
  const [currentFileSize, setCurrentFileSize] = useState(0)
  const uploadStartTimeRef = useRef(null)

  // Chat State (persists when chat is closed)
  const [chatMessages, setChatMessages] = useState([])
  const [readyToPost, setReadyToPost] = useState(false)
  const [hasTriggeredAutoPost, setHasTriggeredAutoPost] = useState(false)

  // Chat Webhook URL
  const CHAT_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/chat'

  // Auto-trigger post when upload completes - works even if chat is closed!
  useEffect(() => {
    if (
      uploadState === 'complete' &&
      videoId &&
      readyToPost &&
      !hasTriggeredAutoPost
    ) {
      console.log('[App] Auto-triggering post - upload complete and ready!')
      setHasTriggeredAutoPost(true)
      sendAutoPostTrigger()
    }
  }, [uploadState, videoId, readyToPost, hasTriggeredAutoPost])

  // Send automatic post trigger to agent (runs from App level)
  const sendAutoPostTrigger = async () => {
    try {
      // Build conversation history from saved messages
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      console.log('[App] Sending auto-post trigger to agent with video_id:', videoId)

      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '[SYSTEM] Video-Upload abgeschlossen. video_id ist jetzt verfügbar. Bitte führe den Post jetzt aus wie besprochen.',
          video_id: videoId,
          notion_page_id: notionPageId,
          conversation_history: conversationHistory,
          upload_in_progress: false,
          auto_post_trigger: true
        })
      })

      const data = await response.json()
      console.log('[App] Auto-post trigger response:', data)

      if (data.success && data.response) {
        // Add the response to chat messages
        setChatMessages(prev => [
          ...prev,
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
        ])
      }
    } catch (error) {
      console.error('[App] Auto-post trigger error:', error)
    }
  }

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
      // Start background upload and open chat immediately
      startBackgroundUpload(validFiles[0])
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
      // Start background upload and open chat immediately
      startBackgroundUpload(validFiles[0])
    }
  }

  // Helper to format time remaining
  const formatTimeRemaining = (seconds) => {
    if (seconds === null || seconds <= 0) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')} verbleibend`
    }
    return `${secs}s verbleibend`
  }

  // Start upload in background and open chat immediately
  const startBackgroundUpload = async (file) => {
    // IMPORTANT: Reset all states for new upload session
    setVideoId(null)
    setVideoUrl(null)
    setNotionPageId(null)
    setChatMessages([])
    setReadyToPost(false)
    setHasTriggeredAutoPost(false)

    // Set upload state
    setUploadState('uploading')
    setUploadProgressPercent(0)
    uploadStartTimeRef.current = Date.now()
    setCurrentFileName(file.name)
    setCurrentFileSize(file.size)
    setFiles([file])

    // Open chat immediately
    setCurrentView('chat')

    try {
      const data = await uploadHybrid(
        file,
        N8N_WEBHOOK_URL,
        (progress) => {
          setUploadProgressPercent(progress)

          // Calculate estimated time remaining
          const elapsed = (Date.now() - uploadStartTimeRef.current) / 1000
          if (progress > 5 && elapsed > 0) {
            const totalEstimated = (elapsed / progress) * 100
            const remaining = totalEstimated - elapsed
            setEstimatedTimeRemaining(remaining)
          }
        }
      )

      // Upload complete!
      setUploadState('complete')
      setUploadProgressPercent(100)
      setEstimatedTimeRemaining(null)

      if (data.video_id) {
        setVideoId(data.video_id)
      }
      if (data.video_url) {
        setVideoUrl(data.video_url)
      }

    } catch (error) {
      console.error('Upload error:', error)
      setUploadState('error')
      setUploadStatus('Upload fehlgeschlagen: ' + error.message)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const resetUpload = () => {
    setCurrentView('upload')
    setFiles([])
    setUploadStatus('')
    setVideoId(null)
    setVideoUrl(null)
    setNotionPageId(null)
    setUploadState('idle')
    setUploadProgressPercent(0)
    setEstimatedTimeRemaining(null)
    setCurrentFileName('')
    setCurrentFileSize(0)
  }

  const handleCloseChat = () => {
    // Just close chat view - don't reset upload!
    // Upload continues in background
    setCurrentView('upload')
  }

  // Full reset - only when starting completely new
  const handleFullReset = () => {
    resetUpload()
    setChatMessages([])
    setReadyToPost(false)
    setHasTriggeredAutoPost(false)
  }


  return (
    <div className="app">
      {/* Upload Status Box - shows when chat is closed but upload is running */}
      {currentView !== 'chat' && uploadState === 'uploading' && (
        <div className="upload-status-box" onClick={() => setCurrentView('chat')}>
          <div className="upload-status-box-icon">📹</div>
          <div className="upload-status-box-content">
            <div className="upload-status-box-filename">{currentFileName}</div>
            <div className="upload-status-box-progress">
              <div
                className="upload-status-box-progress-fill"
                style={{ width: `${uploadProgressPercent}%` }}
              />
            </div>
            <div className="upload-status-box-text">
              {uploadProgressPercent}% {formatTimeRemaining(estimatedTimeRemaining) && `• ${formatTimeRemaining(estimatedTimeRemaining)}`}
            </div>
          </div>
        </div>
      )}

      {/* Upload Complete Box - shows when upload is done but chat is closed */}
      {currentView !== 'chat' && uploadState === 'complete' && (
        <div className="upload-status-box complete" onClick={() => setCurrentView('chat')}>
          <div className="upload-status-box-icon">✅</div>
          <div className="upload-status-box-content">
            <div className="upload-status-box-filename">{currentFileName}</div>
            <div className="upload-status-box-text">Upload abgeschlossen! Klicke um Chat zu öffnen</div>
          </div>
        </div>
      )}

      {currentView === 'chat' && (
        <ChatWindow
          videoId={videoId}
          notionPageId={notionPageId}
          onClose={handleCloseChat}
          uploadState={uploadState}
          uploadProgress={uploadProgressPercent}
          fileName={currentFileName}
          fileSize={currentFileSize}
          timeRemaining={formatTimeRemaining(estimatedTimeRemaining)}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          readyToPost={readyToPost}
          setReadyToPost={setReadyToPost}
        />
      )}
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
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          readyToPost={readyToPost}
          setReadyToPost={setReadyToPost}
        />
      )}
      {showCalendar && (
        <Calendar onClose={() => setShowCalendar(false)} />
      )}
      {showStats && (
        <Stats onClose={() => setShowStats(false)} />
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
        {currentView === 'upload' && (
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
