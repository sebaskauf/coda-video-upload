import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react'
import './Calendar.css'

// n8n Webhook URL - this endpoint should return Notion data
const NOTION_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/notion-calendar'

function Calendar({ onClose }) {
  const [uploads, setUploads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUpload, setSelectedUpload] = useState(null)
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
      setUploads(data.uploads || [])
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
    switch (status?.toLowerCase()) {
      case 'done': return '#22c55e'
      case 'processing': return '#f59e0b'
      case 'waiting instructions': return '#3b82f6'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': return 'Fertig'
      case 'processing': return 'In Bearbeitung'
      case 'waiting instructions': return 'Wartet auf Anweisungen'
      case 'error': return 'Fehler'
      default: return status || 'Unbekannt'
    }
  }

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'instagram': return '📸'
      case 'tiktok': return '🎵'
      case 'youtube': return '▶️'
      case 'facebook': return '👤'
      case 'linkedin': return '💼'
      default: return '📹'
    }
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
            <div className="day-uploads">
              {dayUploads.slice(0, 3).map((upload, idx) => (
                <div
                  key={idx}
                  className="day-upload-dot"
                  style={{ backgroundColor: getStatusColor(upload.status) }}
                  onClick={() => setSelectedUpload(upload)}
                  title={upload.name || upload.video_id}
                />
              ))}
              {dayUploads.length > 3 && (
                <span className="more-uploads">+{dayUploads.length - 3}</span>
              )}
            </div>
          )}
        </div>
      )
    }

    return days
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
                <span className="upload-platform">{getPlatformIcon(upload.platform)}</span>
                <span
                  className="upload-status"
                  style={{ backgroundColor: getStatusColor(upload.status) }}
                >
                  {getStatusLabel(upload.status)}
                </span>
              </div>
              <div className="upload-card-body">
                <h4 className="upload-name">{upload.name || 'Unbenannt'}</h4>
                <p className="upload-customer">{upload.customer || 'Kein Kunde'}</p>
                <p className="upload-date">{formatDate(upload.timestamp)}</p>
              </div>
              {upload.thumbnail && (
                <div className="upload-thumbnail">
                  <img src={upload.thumbnail} alt="Thumbnail" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  const renderUploadDetail = () => {
    if (!selectedUpload) return null

    return (
      <div className="upload-detail-overlay" onClick={() => setSelectedUpload(null)}>
        <div className="upload-detail" onClick={e => e.stopPropagation()}>
          <button className="detail-close" onClick={() => setSelectedUpload(null)}>
            <X size={20} />
          </button>

          <div className="detail-header">
            <span className="detail-platform">{getPlatformIcon(selectedUpload.platform)}</span>
            <h3>{selectedUpload.name || 'Video Upload'}</h3>
            <span
              className="detail-status"
              style={{ backgroundColor: getStatusColor(selectedUpload.status) }}
            >
              {getStatusLabel(selectedUpload.status)}
            </span>
          </div>

          <div className="detail-body">
            {selectedUpload.thumbnail && (
              <div className="detail-thumbnail">
                <img src={selectedUpload.thumbnail} alt="Video Thumbnail" />
              </div>
            )}

            <div className="detail-info">
              <div className="detail-row">
                <span className="detail-label">Kunde:</span>
                <span className="detail-value">{selectedUpload.customer || 'Unbekannt'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Plattform:</span>
                <span className="detail-value">{selectedUpload.platform || 'Nicht angegeben'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Hochgeladen:</span>
                <span className="detail-value">{formatDate(selectedUpload.timestamp)}</span>
              </div>
              {selectedUpload.scheduled_date && (
                <div className="detail-row">
                  <span className="detail-label">Geplant für:</span>
                  <span className="detail-value">{formatDate(selectedUpload.scheduled_date)}</span>
                </div>
              )}
              {selectedUpload.video_id && (
                <div className="detail-row">
                  <span className="detail-label">Video ID:</span>
                  <span className="detail-value mono">{selectedUpload.video_id}</span>
                </div>
              )}
              {selectedUpload.result && (
                <div className="detail-row">
                  <span className="detail-label">Ergebnis:</span>
                  <span className="detail-value">{selectedUpload.result}</span>
                </div>
              )}
            </div>

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
          <span className="stat-value">{uploads.filter(u => u.status?.toLowerCase() === 'done').length}</span>
          <span className="stat-label">Fertig</span>
        </div>
        <div className="stat">
          <span className="stat-value">{uploads.filter(u => u.status?.toLowerCase() === 'processing').length}</span>
          <span className="stat-label">In Bearbeitung</span>
        </div>
        <div className="stat">
          <span className="stat-value">{uploads.filter(u => u.status?.toLowerCase() === 'waiting instructions').length}</span>
          <span className="stat-label">Wartend</span>
        </div>
      </div>

        {selectedUpload && renderUploadDetail()}
      </div>
    </div>
  )
}

export default Calendar
