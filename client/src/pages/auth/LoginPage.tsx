import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = getApiError(err)
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('unauthorized')) {
        setError('Invalid username or password')
      } else {
        setError(msg || 'Cannot connect to server. Please check if the app is running correctly.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--blueprint-deep)',
    }}>
      <div style={{
        width: 380, background: 'var(--paper-light)',
        border: '1px solid var(--rule)',
        padding: '36px 32px 32px',
        boxShadow: '0 16px 48px rgba(27,30,33,0.35)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--orange)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Pill size={20} color="#fff" />
          </div>
          <div style={{
            fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 22,
            color: 'var(--blueprint)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            AbyteMedix
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--steel)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4,
          }}>
            Medical Store Management
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="admin"
              className="field-input"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="field-input"
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--color-danger-bg)', border: '1px solid var(--red-risk)',
              borderRadius: 'var(--radius)', padding: '8px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--red-risk)',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 13, marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
