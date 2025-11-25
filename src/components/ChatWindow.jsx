import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X } from 'lucide-react'
import './ChatWindow.css'

function ChatWindow({ videoId, notionPageId, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: videoId
        ? '✅ Video hochgeladen! Was soll ich damit machen?'
        : '👋 Hey! Ich bin Cornelius. Frag mich was du willst über unser CRM oder sonstige Themen!',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const streamingIntervalRef = useRef(null)

  const CHAT_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/chat'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [inputValue])

  // Cleanup streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current)
      }
    }
  }, [])

  // Streaming text effect - simulate typing character by character
  const streamText = (text) => {
    setIsStreaming(true)
    setStreamingText('')

    let index = 0
    const speed = 20 // milliseconds per character (faster = lower number)

    streamingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setStreamingText(prev => prev + text[index])
        index++
      } else {
        clearInterval(streamingIntervalRef.current)
        setIsStreaming(false)

        // Add the complete message to messages array
        const assistantMessage = {
          role: 'assistant',
          content: text,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        setStreamingText('')
      }
    }, speed)
  }

  const buildConversationHistory = () => {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      // Build conversation history (including the new user message)
      const conversationHistory = [
        ...buildConversationHistory(),
        { role: 'user', content: userMessage }
      ]

      // Call chat webhook
      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          video_id: videoId,
          notion_page_id: notionPageId,
          conversation_history: conversationHistory
        })
      })

      const data = await response.json()

      setIsLoading(false)

      if (data.success && data.response) {
        // Stream the assistant response character by character
        streamText(data.response)
      } else {
        throw new Error('No response from AI')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setIsLoading(false)
      // Stream error message
      streamText('Entschuldigung, da ist etwas schief gelaufen. Bitte versuche es erneut.')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="chat-overlay">
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-title">
              <span className="chat-logo">Cornelius</span> Chat
            </div>
            {videoId && (
              <div className="chat-header-subtitle">
                Video ID: {videoId.substring(0, 8)}...
              </div>
            )}
            {!videoId && (
              <div className="chat-header-subtitle">
                Allgemeine Fragen
              </div>
            )}
          </div>
          <button className="chat-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
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
          <button
            className="chat-send-btn"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatWindow
