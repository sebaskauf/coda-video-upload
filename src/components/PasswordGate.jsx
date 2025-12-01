import { useState, useEffect } from 'react'
import { AUTH_PASSWORD, REQUIRE_USERNAME, AUTH_USERNAME, LOGIN_EXPIRY_DAYS } from '../config/auth'
import './PasswordGate.css'

const PasswordGate = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Check if already logged in
  useEffect(() => {
    const loginData = localStorage.getItem('coda_auth')
    if (loginData) {
      try {
        const { expiry } = JSON.parse(loginData)
        if (expiry && new Date().getTime() < expiry) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('coda_auth')
        }
      } catch {
        localStorage.removeItem('coda_auth')
      }
    }
    setIsLoading(false)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // Check username if required
    if (REQUIRE_USERNAME && username !== AUTH_USERNAME) {
      setError('Falscher Benutzername')
      return
    }

    // Check password
    if (password === AUTH_PASSWORD) {
      const expiry = new Date().getTime() + (LOGIN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      localStorage.setItem('coda_auth', JSON.stringify({ expiry }))
      setIsAuthenticated(true)
    } else {
      setError('Falsches Passwort')
      setPassword('')
    }
  }

  if (isLoading) {
    return (
      <div className="password-gate">
        <div className="password-gate-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return children
  }

  return (
    <div className="password-gate">
      <div className="password-gate-container">
        <div className="password-gate-logo">
          <span className="logo-accent">CODA</span> Marketing
        </div>

        <h1 className="password-gate-title">Anmeldung erforderlich</h1>
        <p className="password-gate-subtitle">Bitte gib deine Zugangsdaten ein</p>

        <form onSubmit={handleSubmit} className="password-gate-form">
          {REQUIRE_USERNAME && (
            <div className="password-gate-field">
              <label htmlFor="username">Benutzername</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Benutzername eingeben"
                autoComplete="username"
              />
            </div>
          )}

          <div className="password-gate-field">
            <label htmlFor="password">Passwort</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && <div className="password-gate-error">{error}</div>}

          <button type="submit" className="password-gate-button">
            Anmelden
          </button>
        </form>
      </div>
    </div>
  )
}

export default PasswordGate
