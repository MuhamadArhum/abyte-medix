import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

export default function LicensePage() {
  const [form, setForm] = useState({
    licenseKey: '',
    storeName: '',
    plan: 'BASIC',
    maxPos: 1,
    expiryDate: '',
  })

  const { data: license, isLoading, refetch } = useQuery({
    queryKey: ['license'],
    queryFn: () => api.get('/license').then(r => r.data),
  })

  const { data: status } = useQuery({
    queryKey: ['license-status'],
    queryFn: () => api.get('/license/status').then(r => r.data),
  })

  const activateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/license/activate', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('License activated successfully')
      refetch()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Activation failed'),
  })

  const set = (f: string, v: string | number) => setForm(p => ({ ...p, [f]: v }))

  const daysRemaining = license?.expiryDate
    ? Math.ceil((new Date(license.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const licenseStatus = license?.isActive
    ? (daysRemaining !== null && daysRemaining <= 30 ? 'warning' : 'active')
    : 'inactive'

  const card: React.CSSProperties = {
    background: 'var(--paper-light)', border: '1px solid var(--rule)',
    borderRadius: 'var(--radius)', padding: 24, marginBottom: 20,
  }
  const labelSm: React.CSSProperties = { fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }
  const valueSm: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="pg-title">License</div>
        <div className="pg-sub">Software license management</div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Current License */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {licenseStatus === 'active' ? (
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius)', background: 'rgba(62,142,90,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} style={{ color: 'var(--green-ok)' }} />
              </div>
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius)', background: 'rgba(194,59,46,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} style={{ color: 'var(--red-risk)' }} />
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 14, color: 'var(--blueprint)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Current License</div>
              <Badge
                label={licenseStatus === 'active' ? 'Active' : licenseStatus === 'warning' ? 'Expiring Soon' : 'Inactive'}
                variant={licenseStatus === 'active' ? 'green' : licenseStatus === 'warning' ? 'yellow' : 'red'}
              />
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Spinner /></div>
          ) : license ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Store Name', value: license.storeName },
                { label: 'Plan', value: license.plan },
                { label: 'Max POS Terminals', value: license.maxPos },
                { label: 'Expiry Date', value: license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : '—' },
                { label: 'Days Remaining', value: daysRemaining !== null ? `${daysRemaining} days` : '—' },
                { label: 'Status', value: status?.message ?? '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={labelSm}>{item.label}</div>
                  <div style={{
                    ...valueSm,
                    color: item.label === 'Days Remaining' && (daysRemaining ?? 0) <= 30 ? 'var(--red-risk)' : 'var(--ink)',
                  }}>
                    {String(item.value ?? '—')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--steel)' }}>No active license found</div>
          )}
        </div>

        {/* Activate Form */}
        <div style={card}>
          <h3 style={{
            fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 14,
            color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.03em',
            marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--rule)',
          }}>Activate License</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="field-label">License Key *</label>
              <input
                className="field-input"
                value={form.licenseKey}
                onChange={e => set('licenseKey', e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="field-label">Store Name</label>
              <input className="field-input" value={form.storeName} onChange={e => set('storeName', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Plan</label>
                <select className="field-input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                  <option value="BASIC">Basic</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
              <div>
                <label className="field-label">Max POS</label>
                <input type="number" className="field-input" value={form.maxPos} onChange={e => set('maxPos', Number(e.target.value))} min={1} />
              </div>
              <div>
                <label className="field-label">Expiry Date</label>
                <input type="date" className="field-input" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
              </div>
            </div>
            <div style={{ paddingTop: 4 }}>
              <button
                onClick={() => activateMutation.mutate(form)}
                disabled={activateMutation.isPending || !form.licenseKey}
                className="btn btn-primary"
              >
                {activateMutation.isPending && <Spinner size="sm" />}
                Activate License
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
