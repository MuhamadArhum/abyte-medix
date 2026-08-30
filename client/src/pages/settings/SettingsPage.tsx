import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, getApiError } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

interface Settings {
  store_name?: string
  store_address?: string
  store_phone?: string
  store_logo?: string
  invoice_prefix?: string
  currency?: string
  low_stock_threshold?: string | number
  expiry_alert_days?: string | number
  backup_path?: string
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card card-p">
      <div className="card-title" style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>({})
  const [loaded, setLoaded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  useEffect(() => {
    if (data && !loaded) {
      setForm(data as Settings)
      setLoaded(true)
    }
  }, [data, loaded])

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/settings', payload).then(r => r.data),
    onSuccess: () => toast.success('Settings saved'),
    onError: (err) => toast.error(getApiError(err)),
  })

  const set = (key: keyof Settings, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    const payload: Record<string, unknown> = {}
    Object.entries(form).forEach(([k, v]) => { if (v !== undefined) payload[k] = v })
    mutation.mutate(payload)
  }

  const inputCls = 'field-input'

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
  }

  return (
    <div>
      <div className="pg-header">
        <div>
          <div className="pg-title">Settings</div>
          <div className="pg-sub">Admin-only store configuration</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending && <Spinner size="sm" />}
          Save Settings
        </button>
      </div>

      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="Store Information">
          <div>
            <label className="field-label">Store Name</label>
            <input className={inputCls} value={form.store_name ?? ''} onChange={e => set('store_name', e.target.value)} placeholder="AbyteMedix" />
          </div>
          <div>
            <label className="field-label">Store Address</label>
            <textarea className={inputCls} value={form.store_address ?? ''} onChange={e => set('store_address', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="field-label">Store Phone</label>
            <input className={inputCls} value={form.store_phone ?? ''} onChange={e => set('store_phone', e.target.value)} />
          </div>
          <div>
            <label className="field-label">Store Logo URL</label>
            <input className={inputCls} value={form.store_logo ?? ''} onChange={e => set('store_logo', e.target.value)} placeholder="https://..." />
          </div>
        </Section>

        <Section title="Invoice Settings">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Invoice Prefix</label>
              <input className={inputCls} value={form.invoice_prefix ?? ''} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV-" />
            </div>
            <div>
              <label className="field-label">Currency</label>
              <input className={inputCls} value={form.currency ?? ''} onChange={e => set('currency', e.target.value)} placeholder="Rs." />
            </div>
          </div>
        </Section>

        <Section title="Alert Thresholds">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Low Stock Threshold</label>
              <input
                type="number"
                className={inputCls}
                value={form.low_stock_threshold ?? ''}
                onChange={e => set('low_stock_threshold', e.target.value)}
                min={0}
              />
              <p className="field-hint">Alert when stock falls below this level</p>
            </div>
            <div>
              <label className="field-label">Expiry Alert Days</label>
              <input
                type="number"
                className={inputCls}
                value={form.expiry_alert_days ?? ''}
                onChange={e => set('expiry_alert_days', e.target.value)}
                min={1}
              />
              <p className="field-hint">Alert when medicine expires within these days</p>
            </div>
          </div>
        </Section>

        <Section title="Backup">
          <div>
            <label className="field-label">Backup Path</label>
            <input className={inputCls} value={form.backup_path ?? ''} onChange={e => set('backup_path', e.target.value)} placeholder="C:/backups/" />
          </div>
        </Section>

        <UpdateSection />
      </div>
    </div>
  )
}

function UpdateSection() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const electron = (window as any).electronAPI

  useEffect(() => {
    if (!electron?.onUpdateAvailable) return
    electron.onUpdateAvailable((info: any) => { setUpdateInfo(info); setStatus('available') })
    electron.onUpdateNotAvailable(() => setStatus('not-available'))
    electron.onUpdateProgress((p: any) => { setProgress(Math.round(p.percent ?? 0)); setStatus('downloading') })
    electron.onUpdateDownloaded(() => setStatus('ready'))
    electron.onUpdateError((msg: string) => { setErrorMsg(msg); setStatus('error') })
  }, [])

  if (!electron?.checkForUpdates) return (
    <div className="card card-p">
      <div className="card-title">App Updates</div>
      <p style={{ fontSize: 13, color: 'var(--steel)' }}>Auto-update is only available in the installed desktop app.</p>
    </div>
  )

  return (
    <div className="card card-p">
      <div className="card-title" style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>App Updates</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--steel)' }}>
            {status === 'idle' && 'Click to check for a new version.'}
            {status === 'checking' && 'Checking for updates…'}
            {status === 'not-available' && 'You are on the latest version.'}
            {status === 'available' && `Update v${updateInfo?.version} is available.`}
            {status === 'downloading' && `Downloading… ${progress}%`}
            {status === 'ready' && 'Update downloaded. Restart to apply.'}
            {status === 'error' && `Update error: ${errorMsg}`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(status === 'idle' || status === 'not-available' || status === 'error') && (
              <button className="btn btn-secondary" onClick={() => { setStatus('checking'); electron.checkForUpdates() }}>
                Check for Updates
              </button>
            )}
            {status === 'available' && (
              <button className="btn btn-primary" onClick={() => electron.downloadUpdate()}>
                Download Update
              </button>
            )}
            {status === 'ready' && (
              <button className="btn btn-primary" onClick={() => electron.installUpdate()}>
                Restart & Install
              </button>
            )}
          </div>
        </div>
        {status === 'downloading' && (
          <div style={{ height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--orange)', width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>
    </div>
  )
}
