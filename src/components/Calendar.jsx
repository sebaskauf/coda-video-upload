import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react'
import PlatformIcon from './PlatformIcon'
import './Calendar.css'

// n8n Webhook URL - this endpoint should return Notion data
const NOTION_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/notion-calendar'

function Calendar({ onClose }) {
  const [uploads, setUploads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUpload, setSelectedUpload] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null) // For day detail view
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'list'

  // Fetch uploads from n8n (which queries Notion)
  const fetchUploads = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(NOTION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_uploads',
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }

      const data = await response.json()
      console.log('[Calendar] Raw response:', data)

      // Handle multiple response formats:
      // 1. Array of uploads: [{ ... }, { ... }]
      // 2. Object with uploads key: { uploads: [...] }
      // 3. Single object: { id: ..., name: ... }
      let rawUploads = []
      if (Array.isArray(data)) {
        rawUploads = data
      } else if (data.uploads && Array.isArray(data.uploads)) {
        rawUploads = data.uploads
      } else if (data.id || data.name || data.timestamp) {
        // Single object returned - wrap in array
        rawUploads = [data]
      }

      console.log('[Calendar] Parsed uploads:', rawUploads.length)

      // Group uploads by customer + date (same customer, same day = one entry)
      const groupedMap = new Map()

      rawUploads.forEach(upload => {
        const date = new Date(upload.timestamp).toDateString()
        const key = `${upload.name}-${date}`

        if (groupedMap.has(key)) {
          // Add platform to existing group
          const existing = groupedMap.get(key)
          if (!existing.platforms.includes(upload.platform)) {
            existing.platforms.push(upload.platform)
          }
          if (upload.account && !existing.accounts.includes(upload.account)) {
            existing.accounts.push(upload.account)
          }
        } else {
          // Create new group
          groupedMap.set(key, {
            ...upload,
            customer: upload.name,
            platforms: [upload.platform].filter(Boolean),
            accounts: [upload.account].filter(Boolean),
            caption: upload.caption || ''
          })
        }
      })

      setUploads(Array.from(groupedMap.values()))
    } catch (err) {
      console.error('Calendar fetch error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUploads()
  }, [currentDate])

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    // Convert Sunday (0) to 7 for Monday-first calendar
    return day === 0 ? 6 : day - 1
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || ''
    if (s.includes('done')) return '#ff6b00'
    if (s.includes('processing')) return '#ff8533'
    if (s.includes('waiting')) return '#ff9500'
    if (s.includes('error')) return '#ef4444'
    return '#6b7280'
  }

  const getStatusLabel = (status) => {
    const s = status?.toLowerCase() || ''
    if (s.includes('done')) return 'Fertig'
    if (s.includes('processing')) return 'In Bearbeitung'
    if (s.includes('waiting')) return 'Wartend'
    if (s.includes('error')) return 'Fehler'
    return status || 'Unbekannt'
  }

  const renderPlatformIcons = (platforms, size = 24) => {
    if (!platforms || platforms.length === 0) {
      return <PlatformIcon platform="default" size={size} />
    }
    return (
      <div className="platform-icons-row">
        {platforms.map((p, idx) => (
          <PlatformIcon key={idx} platform={p} size={size} />
        ))}
      </div>
    )
  }

  // Get uploads for a specific day
  const getUploadsForDay = (day) => {
    return uploads.filter(upload => {
      const uploadDate = new Date(upload.timestamp)
      return (
        uploadDate.getDate() === day &&
        uploadDate.getMonth() === currentDate.getMonth() &&
        uploadDate.getFullYear() === currentDate.getFullYear()
      )
    })
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayUploads = getUploadsForDay(day)
      const isToday =
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear()

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${dayUploads.length > 0 ? 'has-uploads' : ''}`}
        >
          <span className="day-number">{day}</span>
          {dayUploads.length > 0 && (
            <div
              className="day-upload-badge"
              onClick={() => setSelectedDay({ day, uploads: dayUploads })}
            >
              <span className="badge-count">{dayUploads.length}</span>
            </div>
          )}
        </div>
      )
    }

    return days
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDay = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const renderListView = () => {
    const sortedUploads = [...uploads].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    )

    return (
      <div className="uploads-list">
        {sortedUploads.length === 0 ? (
          <div className="no-uploads">Keine Uploads in diesem Monat</div>
        ) : (
          sortedUploads.map((upload, idx) => (
            <div
              key={idx}
              className="upload-card"
              onClick={() => setSelectedUpload(upload)}
            >
              <div className="upload-card-header">
                <span className="upload-platforms">{renderPlatformIcons(upload.platforms, 28)}</span>
                <span
                  className="upload-status"
                  style={{ backgroundColor: getStatusColor(upload.status) }}
                >
                  {getStatusLabel(upload.status)}
                </span>
              </div>
              <div className="upload-card-body">
                <h4 className="upload-customer-name">{upload.customer || 'Unbekannt'}</h4>
                <div className="upload-meta">
                  <span className="upload-day">{formatDay(upload.timestamp)}</span>
                  <span className="upload-time">{formatTime(upload.timestamp)}</span>
                </div>
                {upload.accounts && upload.accounts.length > 0 && (
                  <p className="upload-accounts">{upload.accounts.join(', ')}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderDayDetail = () => {
    if (!selectedDay) return null

    return (
      <div className="day-detail-overlay" onClick={() => setSelectedDay(null)}>
        <div className="day-detail-container" onClick={e => e.stopPropagation()}>
          <button className="detail-close" onClick={() => setSelectedDay(null)}>
            <X size={20} />
          </button>

          <div className="day-detail-header">
            <h3>{selectedDay.day}. {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <span className="day-detail-count">{selectedDay.uploads.length} {selectedDay.uploads.length === 1 ? 'Post' : 'Posts'}</span>
          </div>

          <div className="day-detail-list">
            {selectedDay.uploads.map((upload, idx) => {
              const displayName = upload.accounts?.[0] || upload.account || 'Unbekannt'
              return (
                <div
                  key={idx}
                  className="day-detail-card"
                  onClick={() => {
                    setSelectedUpload(upload)
                  }}
                >
                  <div className="day-detail-card-left">
                    <span className="day-detail-platform">{renderPlatformIcons(upload.platforms, 32)}</span>
                  </div>
                  <div className="day-detail-card-content">
                    <h4 className="day-detail-name">{displayName}</h4>
                    <span className="day-detail-time">{formatTime(upload.timestamp)}</span>
                    {upload.platforms && upload.platforms.length > 0 && (
                      <span className="day-detail-platforms">{upload.platforms.join(', ')}</span>
                    )}
                  </div>
                  <ChevronRight size={20} className="day-detail-arrow" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderUploadDetail = () => {
    if (!selectedUpload) return null

    // Use account as primary display name, fallback to first account in array
    const displayName = selectedUpload.accounts?.[0] || selectedUpload.account || 'Unbekannt'

    return (
      <div className="upload-detail-overlay" onClick={() => setSelectedUpload(null)}>
        <div className="upload-detail" onClick={e => e.stopPropagation()}>
          <button className="detail-close" onClick={() => setSelectedUpload(null)}>
            <X size={20} />
          </button>

          <div className="detail-header">
            <span className="detail-platform">{renderPlatformIcons(selectedUpload.platforms, 36)}</span>
            <h3>{displayName}</h3>
          </div>

          <div className="detail-body">
            <div className="detail-info">
              <div className="detail-row">
                <span className="detail-label">Datum:</span>
                <span className="detail-value">{formatDay(selectedUpload.timestamp)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Uhrzeit:</span>
                <span className="detail-value">{formatTime(selectedUpload.timestamp)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Plattformen:</span>
                <span className="detail-value">{selectedUpload.platforms?.join(', ') || 'Keine'}</span>
              </div>
              {selectedUpload.accounts && selectedUpload.accounts.length > 1 && (
                <div className="detail-row">
                  <span className="detail-label">Weitere Accounts:</span>
                  <span className="detail-value">{selectedUpload.accounts.slice(1).join(', ')}</span>
                </div>
              )}
            </div>

            {selectedUpload.caption && (
              <div className="detail-caption">
                <span className="detail-label">Caption:</span>
                <p className="caption-text">{selectedUpload.caption}</p>
              </div>
            )}

            {selectedUpload.video_url && (
              <a
                href={selectedUpload.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-video-link"
              >
                Video ansehen
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-overlay" onClick={onClose}>
      <div className="calendar-container" onClick={e => e.stopPropagation()}>
        <div className="calendar-header">
          <div className="calendar-title">
            <h2>Video Kalender</h2>
            <button className="calendar-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

        <div className="calendar-controls">
          <div className="view-toggle">
            <button
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
            >
              Kalender
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              Liste
            </button>
          </div>

          <div className="month-nav">
            <button onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={20} />
            </button>
            <span className="current-month">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={() => navigateMonth(1)}>
              <ChevronRight size={20} />
            </button>
          </div>

          <button className="refresh-btn" onClick={fetchUploads} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="calendar-body">
        {isLoading ? (
          <div className="calendar-loading">
            <Loader2 size={32} className="spinning" />
            <p>Lade Uploads...</p>
          </div>
        ) : error ? (
          <div className="calendar-error">
            <p>{error}</p>
            <button onClick={fetchUploads}>Erneut versuchen</button>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {dayNames.map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-days">
              {renderCalendarGrid()}
            </div>
          </div>
        ) : (
          renderListView()
        )}
      </div>

      {/* Stats */}
      <div className="calendar-stats">
        <div className="stat">
          <span className="stat-value">{uploads.length}</span>
          <span className="stat-label">Uploads gesamt</span>
        </div>
        <div className="stat">
          <span className="stat-value">{uploads.filter(u => {
            const s = u.status?.toLowerCase() || ''
            return s.includes('waiting') || s.includes('scheduled') || s.includes('planned') || s.includes('geplant')
          }).length}</span>
          <span className="stat-label">Geplant</span>
        </div>
      </div>

        {selectedDay && renderDayDetail()}
        {selectedUpload && renderUploadDetail()}
      </div>
    </div>
  )
}

export default Calendar
