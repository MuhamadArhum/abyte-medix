import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../api/client'
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
    <div style={{ background: '#FFFFFF', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: 20 }}>
      <h3 style={{ fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>{title}</h3>
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
      const s: Settings = {}
      const entries = Array.isArray(data)
        ? data
        : Object.entries(data).map(([key, value]) => ({ key, value }))

      entries.forEach((e: any) => {
        const k = e.key as keyof Settings
        ;(s as any)[k] = e.value
      })
      setForm(s)
      setLoaded(true)
    }
  }, [data, loaded])

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/settings', payload).then(r => r.data),
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  })

  const set = (key: keyof Settings, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    const payload: Record<string, unknown> = {}
    Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== '') payload[k] = v })
    mutation.mutate(payload)
  }

  const inputCls: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
    padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none',
    width: '100%', fontFamily: 'var(--font-sans)',
  }

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>Settings</h1>
          <div style={{ fontSize: 12.5, color: 'var(--steel)', marginTop: 2 }}>Admin-only store configuration</div>
        </div>
        <button onClick={handleSave} disabled={mutation.isPending} style={{
          background: '#17B978', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
          padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)',
          opacity: mutation.isPending ? 0.7 : 1,
        }}>
          {mutation.isPending && <Spinner size="sm" />}
          Save Settings
        </button>
      </div>

      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="Store Information">
          <div>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Store Name</label>
            <input style={inputCls} value={form.store_name ?? ''} onChange={e => set('store_name', e.target.value)} placeholder="AbyteMedix" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Store Address</label>
            <textarea style={inputCls} value={form.store_address ?? ''} onChange={e => set('store_address', e.target.value)} rows={2} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Store Phone</label>
            <input style={inputCls} value={form.store_phone ?? ''} onChange={e => set('store_phone', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Store Logo URL</label>
            <input style={inputCls} value={form.store_logo ?? ''} onChange={e => set('store_logo', e.target.value)} placeholder="https://..." />
          </div>
        </Section>

        <Section title="Invoice Settings">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Invoice Prefix</label>
              <input style={inputCls} value={form.invoice_prefix ?? ''} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV-" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Currency</label>
              <input style={inputCls} value={form.currency ?? ''} onChange={e => set('currency', e.target.value)} placeholder="Rs." />
            </div>
          </div>
        </Section>

        <Section title="Alert Thresholds">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Low Stock Threshold</label>
              <input
                type="number"
                style={inputCls}
                value={form.low_stock_threshold ?? ''}
                onChange={e => set('low_stock_threshold', e.target.value)}
                min={0}
              />
              <p style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>Alert when stock falls below this level</p>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Expiry Alert Days</label>
              <input
                type="number"
                style={inputCls}
                value={form.expiry_alert_days ?? ''}
                onChange={e => set('expiry_alert_days', e.target.value)}
                min={1}
              />
              <p style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>Alert when medicine expires within these days</p>
            </div>
          </div>
        </Section>

        <Section title="Backup">
          <div>
            <label style={{ fontSize: 11, color: 'var(--steel)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Backup Path</label>
            <input style={inputCls} value={form.backup_path ?? ''} onChange={e => set('backup_path', e.target.value)} placeholder="C:/backups/" />
          </div>
        </Section>
      </div>
    </div>
  )
}
