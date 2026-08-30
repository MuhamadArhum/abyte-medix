import { useState } from 'react'
import { Monitor, Network, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'

type Mode = 'single' | 'lan'
type Step = 'choose' | 'configure'

const C = {
  primary: '#D9A441',
  bg: '#F5F3EE',
  border: '#E0DDD5',
  text: '#17181A',
  sub: '#75797D',
  danger: '#C23B2E',
  green: '#3E8E5A',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
}

export default function SetupPage() {
  const [step, setStep] = useState<Step>('choose')
  const [mode, setMode] = useState<Mode>('single')
  const [serverIp, setServerIp] = useState('')
  const [serverPort, setServerPort] = useState('3002')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const eAPI = (window as any)?.electronAPI

  // If already configured (browser/dev mode), skip setup
  if (!eAPI && localStorage.getItem('abyte_config')) {
    window.location.hash = '/login'
    return null
  }

  async function handleSave() {
    setError('')

    if (mode === 'lan' && !serverIp.trim()) {
      setError('Server IP address is required')
      return
    }

    setSaving(true)
    try {
      const serverUrl = mode === 'single'
        ? 'http://127.0.0.1:3002/api'
        : `http://${serverIp.trim()}:${serverPort}/api`

      if (eAPI?.restartWithConfig) {
        await eAPI.restartWithConfig({ mode, serverUrl })
      } else {
        localStorage.setItem('abyte_config', JSON.stringify({ mode, serverUrl }))
        window.location.hash = '/login'
      }
    } catch (e: any) {
      setError(e.message || 'Setup failed')
      setSaving(false)
    }
  }

  if (step === 'choose') {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: C.bg, padding: 24,
      }}>
        <img src="/icon.png" alt="AbyteMedix" style={{ width: 56, height: 56, marginBottom: 12, borderRadius: 12 }} onError={e => (e.currentTarget.style.display = 'none')} />
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>AbyteMedix Setup</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 32 }}>Choose how you want to use this application</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 460 }}>

          <button
            onClick={() => { setMode('single'); setStep('configure') }}
            style={{
              textAlign: 'left', padding: '18px 20px', borderRadius: 12,
              border: `2px solid ${C.primary}`, background: 'rgba(217,164,65,0.06)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Monitor size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Single PC Setup</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                Everything runs on this computer — no installation needed.<br />
                <span style={{ color: C.primary, fontWeight: 600 }}>Recommended for most pharmacies.</span>
              </div>
            </div>
            <ChevronRight size={18} color={C.sub} />
          </button>

          <button
            onClick={() => { setMode('lan'); setStep('configure') }}
            style={{
              textAlign: 'left', padding: '18px 20px', borderRadius: 12,
              border: `1px solid ${C.border}`, background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#E8F4ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Network size={22} color={C.green} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Connect to Server (LAN)</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                This PC is a cashier terminal connecting to a<br />separate server PC over the network.
              </div>
            </div>
            <ChevronRight size={18} color={C.sub} />
          </button>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: C.sub, textAlign: 'center' }}>
          AbyteMedix v1.2.2 · Medical Store Management System
        </div>
      </div>
    )
  }

  // Configure step
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: C.bg, padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <button onClick={() => setStep('choose')} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 12, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          ← Back
        </button>

        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          {mode === 'single' ? 'Ready to Launch' : 'Server Connection'}
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 24 }}>
          {mode === 'single'
            ? 'Database is included — no additional setup required'
            : 'Enter the IP address of the server PC on your network'}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {mode === 'single' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#F0FAF4', borderRadius: 8, border: '1px solid #C6E8D3' }}>
                <CheckCircle size={16} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#2D6A45' }}>
                  <b>Database included</b> — MariaDB will start automatically with the app. No XAMPP or MySQL installation required.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#F0FAF4', borderRadius: 8, border: '1px solid #C6E8D3' }}>
                <CheckCircle size={16} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#2D6A45' }}>
                  <b>Default login:</b> username <code>admin</code>, password <code>admin123</code>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Server PC IP Address</Label>
                <input style={inp} value={serverIp} onChange={e => setServerIp(e.target.value)} placeholder="e.g. 192.168.1.10" autoFocus />
              </div>
              <div>
                <Label>Server Port</Label>
                <input style={inp} value={serverPort} onChange={e => setServerPort(e.target.value)} placeholder="3002" />
              </div>
              <div style={{ fontSize: 11, color: C.sub, background: C.bg, borderRadius: 8, padding: '8px 12px' }}>
                The server PC must have AbyteMedix Server running and port {serverPort} must be open in its firewall.
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: C.danger, background: 'rgba(194,59,46,0.08)', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '11px', borderRadius: 9, border: 'none',
              background: C.primary, color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</>
              : mode === 'single' ? 'Launch AbyteMedix' : 'Connect & Launch'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#75797D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>
      {children}
    </div>
  )
}
