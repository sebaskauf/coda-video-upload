import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X, Square } from 'lucide-react'
import './ChatWindow.css'

// Chat Mascot Component
const ChatMascot = ({ mouthOpen, isListening, isThinking, isWorking, isCelebrating }) => {
  // Determine mascot state class
  let stateClass = ''
  if (isCelebrating) stateClass = 'celebrating'
  else if (isWorking) stateClass = 'working'
  else if (isListening) stateClass = 'listening'
  else if (isThinking) stateClass = 'thinking'

  return (
    <div className={`chat-mascot ${stateClass}`}>
      {/* Laptop appears when working */}
      {isWorking && !isCelebrating && (
        <div className="mascot-laptop">
          <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Laptop screen */}
            <rect x="10" y="5" width="100" height="55" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="2"/>
            {/* Screen content - code lines */}
            <rect x="18" y="14" width="40" height="3" rx="1" fill="#ff6b00" className="code-line code-line-1"/>
            <rect x="18" y="22" width="60" height="3" rx="1" fill="#ff8533" className="code-line code-line-2"/>
            <rect x="18" y="30" width="35" height="3" rx="1" fill="#ff6b00" className="code-line code-line-3"/>
            <rect x="18" y="38" width="55" height="3" rx="1" fill="#ff8533" className="code-line code-line-4"/>
            <rect x="18" y="46" width="45" height="3" rx="1" fill="#ff6b00" className="code-line code-line-5"/>
            {/* Laptop base/keyboard */}
            <path d="M5 60 L10 55 L110 55 L115 60 L120 75 L0 75 L5 60Z" fill="#2a2a2a" stroke="#333" strokeWidth="1"/>
            {/* Keyboard keys */}
            <rect x="20" y="62" width="80" height="8" rx="2" fill="#1a1a1a"/>
          </svg>
        </div>
      )}

      <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <ellipse cx="100" cy="180" rx="60" ry="50" fill="url(#chatMascotGradient)" />

        {/* Ear - behind head, visible when listening */}
        <ellipse
          cx="170"
          cy="75"
          rx="18"
          ry="25"
          fill="url(#chatMascotEarGradient)"
          className={`chat-mascot-ear ${isListening ? 'listening' : ''}`}
        />
        {/* Inner ear detail */}
        <ellipse
          cx="172"
          cy="75"
          rx="10"
          ry="16"
          fill="url(#chatMascotEarInnerGradient)"
          className={`chat-mascot-ear-inner ${isListening ? 'listening' : ''}`}
        />

        {/* Head - drawn after ear so it's in front */}
        <ellipse cx="100" cy="90" rx="70" ry="60" fill="url(#chatMascotGradient)" />

        {/* Eyes - squint when listening, look up when thinking, focused when working */}
        <ellipse
          cx="75"
          cy={isThinking ? "78" : isWorking ? "85" : "80"}
          rx="12"
          ry={isListening ? "8" : isWorking ? "12" : "15"}
          fill="white"
          className={`chat-mascot-eye chat-mascot-eye-left ${isListening ? 'squinting' : ''} ${isThinking ? 'thinking' : ''} ${isWorking ? 'working' : ''}`}
        />
        <ellipse
          cx="125"
          cy={isThinking ? "78" : isWorking ? "85" : "80"}
          rx="12"
          ry={isListening ? "8" : isWorking ? "12" : "15"}
          fill="white"
          className={`chat-mascot-eye chat-mascot-eye-right ${isListening ? 'squinting' : ''} ${isThinking ? 'thinking' : ''} ${isWorking ? 'working' : ''}`}
        />

        {/* Thinking dots above head */}
        {isThinking && (
          <>
            <circle cx="160" cy="30" r="6" fill="#ff8533" className="thinking-dot thinking-dot-1" />
            <circle cx="175" cy="15" r="8" fill="#ff8533" className="thinking-dot thinking-dot-2" />
            <circle cx="195" cy="5" r="10" fill="#ff8533" className="thinking-dot thinking-dot-3" />
          </>
        )}

        {/* Mouth - focused/concentrated expression when working */}
        <ellipse
          cx="100"
          cy={isWorking ? "112" : "110"}
          rx={isWorking ? "6" : "10"}
          ry={mouthOpen ? "8" : isWorking ? "2" : "3"}
          fill="white"
          className="chat-mascot-mouth"
        />

        {/* Arms - typing position when working */}
        <ellipse cx="35" cy="170" rx="20" ry="25" fill="url(#chatMascotGradient)" className={`chat-mascot-arm-left ${isThinking ? 'thinking' : ''} ${isWorking ? 'typing' : ''}`} />
        <ellipse cx="165" cy="170" rx="20" ry="25" fill="url(#chatMascotGradient)" className={`chat-mascot-arm-right ${isThinking ? 'thinking' : ''} ${isWorking ? 'typing' : ''}`} />

        <defs>
          <linearGradient id="chatMascotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b00" />
            <stop offset="50%" stopColor="#ff8533" />
            <stop offset="100%" stopColor="#ff6b00" />
          </linearGradient>
          <linearGradient id="chatMascotEarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#ff8533" />
          </linearGradient>
          <radialGradient id="chatMascotEarInnerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#cc5500" />
            <stop offset="100%" stopColor="#ff6b00" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

function ChatWindow({
  videoId,
  notionPageId,
  onClose,
  uploadState = 'idle',
  uploadProgress = 0,
  fileName = '',
  fileSize = 0,
  timeRemaining = '',
  chatMessages = [],
  setChatMessages = () => {},
  readyToPost = false,
  setReadyToPost = () => {},
  shouldCelebrate = false
}) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [initialTypingText, setInitialTypingText] = useState('')
  // Only show initial typing if there are no messages yet
  const [isInitialTyping, setIsInitialTyping] = useState(chatMessages.length === 0)
  const [mouthOpen, setMouthOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isWorking, setIsWorking] = useState(false) // For laptop typing animation
  const [isCelebrating, setIsCelebrating] = useState(false) // For thumbs-up celebration
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const streamingIntervalRef = useRef(null)
  const initialTypingRef = useRef(null)
  const abortControllerRef = useRef(null)
  // Reset ref when chatMessages is empty (new session)
  const hasInitializedRef = useRef(false)

  // Sync ref with chatMessages - if messages exist, we're initialized
  useEffect(() => {
    if (chatMessages.length > 0) {
      hasInitializedRef.current = true
    }
  }, [chatMessages])

  // Show working animation when readyToPost becomes true (bot is uploading to Postiz)
  useEffect(() => {
    if (readyToPost) {
      setIsWorking(true)
    }
  }, [readyToPost])

  // Trigger celebration when shouldCelebrate prop becomes true
  useEffect(() => {
    if (shouldCelebrate) {
      console.log('[ChatWindow] shouldCelebrate triggered! Starting celebration animation')
      setIsWorking(false)
      setIsCelebrating(true)
    } else {
      setIsCelebrating(false)
    }
  }, [shouldCelebrate])

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i]
  }

  // Initial greeting message based on upload state
  const getInitialMessage = () => {
    if (uploadState === 'uploading' || uploadState === 'complete' || videoId) {
      return '📹 Hey! Sag mir, was ich mit dem Video machen soll - für welchen Kunden, auf welche Plattform, und wann?'
    }
    return '👋 Hey! Ich bin Quandale. Frag mich was du willst über unser CRM oder sonstige Themen!'
  }

  const initialMessage = getInitialMessage()

  // Typewriter effect for initial message - ONLY if no messages exist yet
  useEffect(() => {
    // Skip if already initialized (messages exist)
    if (hasInitializedRef.current) {
      setIsInitialTyping(false)
      return
    }

    // Mark as initialized
    hasInitializedRef.current = true

    let index = 0
    setIsInitialTyping(true)
    setInitialTypingText('')

    initialTypingRef.current = setInterval(() => {
      if (index < initialMessage.length) {
        // Open mouth for each character
        setMouthOpen(true)
        setTimeout(() => setMouthOpen(false), 20)
        setInitialTypingText(initialMessage.substring(0, index + 1))
        index++
      } else {
        clearInterval(initialTypingRef.current)
        setIsInitialTyping(false)
        setMouthOpen(false)
        // Add the complete message to messages array
        setChatMessages([{
          role: 'assistant',
          content: initialMessage,
          timestamp: new Date()
        }])
        setInitialTypingText('')
      }
    }, 30)

    return () => {
      if (initialTypingRef.current) {
        clearInterval(initialTypingRef.current)
      }
    }
  }, [])

  const CHAT_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/chat'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, streamingText])

  // Auto-resize textarea and set listening state
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
    // Set listening when user is typing
    setIsListening(inputValue.length > 0)
  }, [inputValue])

  // Cleanup streaming interval and abort controller on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Stop generation function
  const handleStopGeneration = () => {
    // Abort the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Stop the streaming text animation
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current)
    }

    // If there's partial streaming text, add it as a message
    if (streamingText) {
      const partialMessage = {
        role: 'assistant',
        content: streamingText + ' [abgebrochen]',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, partialMessage])
    }

    // Reset states
    setStreamingText('')
    setIsStreaming(false)
    setIsLoading(false)
    setIsThinking(false)
    setMouthOpen(false)
  }

  // Streaming text effect - simulate typing character by character
  const streamText = (text) => {
    if (!text) return

    setIsStreaming(true)
    setStreamingText('')
    setIsListening(false)
    setIsThinking(false)

    let currentText = ''
    let index = 0
    const speed = 20 // milliseconds per character (faster = lower number)

    streamingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        // Toggle mouth open/close for each character
        setMouthOpen(index % 2 === 0)
        currentText += text[index]
        setStreamingText(currentText)
        index++
      } else {
        clearInterval(streamingIntervalRef.current)
        setIsStreaming(false)
        setMouthOpen(false)

        // Add the complete message to messages array
        const assistantMessage = {
          role: 'assistant',
          content: text,
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, assistantMessage])
        setStreamingText('')
      }
    }, speed)
  }

  const buildConversationHistory = () => {
    return chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }

  // Core function to send message to API
  const sendMessageToApi = async (userMessage) => {
    setIsThinking(true)
    setIsLoading(true)

    try {
      // Build conversation history (including the new user message)
      const conversationHistory = [
        ...buildConversationHistory(),
        { role: 'user', content: userMessage }
      ]

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Call chat webhook
      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          video_id: videoId || null,
          notion_page_id: notionPageId || null,
          conversation_history: conversationHistory,
          upload_in_progress: uploadState === 'uploading'
        }),
        signal: abortControllerRef.current.signal
      })

      const data = await response.json()

      setIsLoading(false)

      if (data.success && data.response) {
        // Check if agent signals ready to post
        if (data.ready_to_post === true) {
          setReadyToPost(true)
          console.log('[Chat] Agent signaled ready to post')
        }

        // Stream the assistant response character by character
        streamText(data.response)
      } else {
        throw new Error('No response from AI')
      }
    } catch (error) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError') {
        return
      }
      console.error('Chat error:', error)
      setIsLoading(false)
      setIsThinking(false)
      // Stream error message
      streamText('Entschuldigung, da ist etwas schief gelaufen. Bitte versuche es erneut.')
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsListening(false)

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, newUserMessage])

    // Always send immediately - the agent can chat without video_id
    // video_id will be available when needed for final posting
    await sendMessageToApi(userMessage)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="chat-overlay">
      <ChatMascot mouthOpen={mouthOpen} isListening={isListening} isThinking={isThinking} isWorking={isWorking} isCelebrating={isCelebrating} />

      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-title">
              <span className="chat-logo">Quandale</span> Chat
            </div>
            {videoId && uploadState === 'complete' && (
              <div className="chat-header-subtitle">
                ✅ Video bereit
              </div>
            )}
            {!videoId && uploadState !== 'uploading' && (
              <div className="chat-header-subtitle">
                Allgemeine Fragen
              </div>
            )}
          </div>
          <button className="chat-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Upload Progress Bar */}
        {uploadState === 'uploading' && (
          <div className="upload-progress-container">
            <div className="upload-progress-info">
              <span className="upload-progress-filename">📹 {fileName}</span>
              <span className="upload-progress-size">({formatFileSize(fileSize)})</span>
            </div>
            <div className="upload-progress-bar-wrapper">
              <div
                className="upload-progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="upload-progress-details">
              <span className="upload-progress-percent">{uploadProgress}%</span>
              {timeRemaining && (
                <span className="upload-progress-time">{timeRemaining}</span>
              )}
            </div>
          </div>
        )}

        {/* Upload Complete Banner */}
        {uploadState === 'complete' && !videoId && (
          <div className="upload-complete-banner">
            ✅ Upload abgeschlossen - wird verarbeitet...
          </div>
        )}

        <div className="chat-messages">
          {/* Initial typing effect */}
          {isInitialTyping && (
            <div className="chat-message assistant streaming">
              <div className="chat-message-content">
                {initialTypingText}
                <span className="cursor-blink">|</span>
              </div>
            </div>
          )}

          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`}
            >
              <div className="chat-message-content">
                {message.content}
              </div>
              <div className="chat-message-time">
                {message.timestamp.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="chat-message assistant streaming">
              <div className="chat-message-content">
                {streamingText}
                <span className="cursor-blink">|</span>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="chat-message assistant typing">
              <div className="chat-message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Nachricht schreiben..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          {(isLoading || isStreaming) ? (
            <button
              className="chat-stop-btn"
              onClick={handleStopGeneration}
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              className="chat-send-btn"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatWindow
