import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, X, TrendingUp, Users, Video, Calendar } from 'lucide-react'
import './Stats.css'

const NOTION_WEBHOOK_URL = 'https://n8n-self-host-n8n.qpo7vu.easypanel.host/webhook/notion-calendar'

function Stats({ onClose }) {
  const [uploads, setUploads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUploads = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(NOTION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_uploads' })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Daten')
      }

      const data = await response.json()
      console.log('[Stats] Raw response:', data)

      // Handle multiple response formats
      let rawUploads = []
      if (Array.isArray(data)) {
        rawUploads = data
      } else if (data.uploads && Array.isArray(data.uploads)) {
        rawUploads = data.uploads
      } else if (data.id || data.name || data.timestamp) {
        // Single object returned - wrap in array
        rawUploads = [data]
      }

      console.log('[Stats] Parsed uploads:', rawUploads.length)
      setUploads(rawUploads)
    } catch (err) {
      console.error('Stats fetch error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUploads()
  }, [])

  // Filter uploads from last 30 days
  const getLastMonthUploads = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return uploads.filter(upload => {
      const uploadDate = new Date(upload.timestamp)
      return uploadDate >= thirtyDaysAgo
    })
  }

  // Get customer stats sorted by upload count
  const getCustomerStats = () => {
    const lastMonthUploads = getLastMonthUploads()
    const customerMap = new Map()

    lastMonthUploads.forEach(upload => {
      const customer = upload.name || 'Unbekannt'

      if (customerMap.has(customer)) {
        const existing = customerMap.get(customer)
        existing.count++
        if (!existing.platforms.includes(upload.platform)) {
          existing.platforms.push(upload.platform)
        }
        if (upload.account && !existing.accounts.includes(upload.account)) {
          existing.accounts.push(upload.account)
        }
      } else {
        customerMap.set(customer, {
          name: customer,
          count: 1,
          platforms: [upload.platform].filter(Boolean),
          accounts: [upload.account].filter(Boolean)
        })
      }
    })

    return Array.from(customerMap.values())
      .sort((a, b) => b.count - a.count)
  }

  // Get platform stats
  const getPlatformStats = () => {
    const lastMonthUploads = getLastMonthUploads()
    const platformMap = new Map()

    lastMonthUploads.forEach(upload => {
      const platform = upload.platform || 'other'
      platformMap.set(platform, (platformMap.get(platform) || 0) + 1)
    })

    return Array.from(platformMap.entries())
      .sort((a, b) => b[1] - a[1])
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

  const getPlatformName = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'instagram': return 'Instagram'
      case 'tiktok': return 'TikTok'
      case 'youtube': return 'YouTube'
      case 'facebook': return 'Facebook'
      case 'linkedin': return 'LinkedIn'
      default: return platform || 'Andere'
    }
  }

  const lastMonthUploads = getLastMonthUploads()
  const customerStats = getCustomerStats()
  const platformStats = getPlatformStats()

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-container" onClick={e => e.stopPropagation()}>
        <div className="stats-header">
          <div className="stats-title">
            <TrendingUp size={24} className="stats-icon" />
            <h2>Übersicht</h2>
          </div>
          <div className="stats-header-actions">
            <button className="stats-refresh" onClick={fetchUploads} disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
            </button>
            <button className="stats-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="stats-body">
          {isLoading ? (
            <div className="stats-loading">
              <Loader2 size={32} className="spinning" />
              <p>Lade Statistiken...</p>
            </div>
          ) : error ? (
            <div className="stats-error">
              <p>{error}</p>
              <button onClick={fetchUploads}>Erneut versuchen</button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="stats-summary">
                <div className="summary-card">
                  <Video size={24} />
                  <div className="summary-content">
                    <span className="summary-value">{lastMonthUploads.length}</span>
                    <span className="summary-label">Uploads (30 Tage)</span>
                  </div>
                </div>
                <div className="summary-card">
                  <Users size={24} />
                  <div className="summary-content">
                    <span className="summary-value">{customerStats.length}</span>
                    <span className="summary-label">Aktive Kunden</span>
                  </div>
                </div>
                <div className="summary-card">
                  <Calendar size={24} />
                  <div className="summary-content">
                    <span className="summary-value">
                      {lastMonthUploads.length > 0
                        ? (lastMonthUploads.length / 30).toFixed(1)
                        : '0'}
                    </span>
                    <span className="summary-label">Uploads/Tag</span>
                  </div>
                </div>
              </div>

              {/* Top Customers */}
              <div className="stats-section">
                <h3>Top Kunden (letzte 30 Tage)</h3>
                <div className="customer-list">
                  {customerStats.length === 0 ? (
                    <div className="no-data">Keine Uploads im letzten Monat</div>
                  ) : (
                    customerStats.slice(0, 10).map((customer, idx) => (
                      <div key={customer.name} className="customer-row">
                        <div className="customer-rank">#{idx + 1}</div>
                        <div className="customer-info">
                          <span className="customer-name">{customer.name}</span>
                          <span className="customer-accounts">
                            {customer.accounts.slice(0, 3).join(', ')}
                            {customer.accounts.length > 3 && ` +${customer.accounts.length - 3}`}
                          </span>
                        </div>
                        <div className="customer-platforms">
                          {customer.platforms.map(p => (
                            <span key={p} title={getPlatformName(p)}>{getPlatformIcon(p)}</span>
                          ))}
                        </div>
                        <div className="customer-count">
                          <span className="count-value">{customer.count}</span>
                          <span className="count-label">Videos</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Platform Stats */}
              <div className="stats-section">
                <h3>Plattformen</h3>
                <div className="platform-list">
                  {platformStats.map(([platform, count]) => {
                    const percentage = lastMonthUploads.length > 0
                      ? Math.round((count / lastMonthUploads.length) * 100)
                      : 0
                    return (
                      <div key={platform} className="platform-row">
                        <div className="platform-info">
                          <span className="platform-icon">{getPlatformIcon(platform)}</span>
                          <span className="platform-name">{getPlatformName(platform)}</span>
                        </div>
                        <div className="platform-bar-container">
                          <div
                            className="platform-bar"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="platform-stats">
                          <span className="platform-count">{count}</span>
                          <span className="platform-percent">{percentage}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Stats
