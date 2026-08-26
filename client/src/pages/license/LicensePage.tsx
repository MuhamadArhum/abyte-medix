import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, AlertTriangle, Key } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

export default function LicensePage() {
  const [licenseKey, setLicenseKey] = useState('')
  const qc = useQueryClient()

  const { data: license, isLoading } = useQuery({
    queryKey: ['license'],
    queryFn: () => api.get('/license').then(r => r.data),
  })

  const { data: status } = useQuery({
    queryKey: ['license-status'],
    queryFn: () => api.get('/license/status').then(r => r.data),
  })

  const activateMutation = useMutation({
    mutationFn: (key: string) => api.post('/license/activate', { licenseKey: key }).then(r => r.data),
    onSuccess: () => {
      toast.success('License activated successfully')
      setLicenseKey('')
      qc.invalidateQueries({ queryKey: ['license'] })
      qc.invalidateQueries({ queryKey: ['license-status'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Activation failed'),
  })

  const daysRemaining = license?.expiryDate
    ? Math.ceil((new Date(license.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isActive = license?.status === 'ACTIVE'
  const licenseStatus = isActive
    ? (daysRemaining !== null && daysRemaining <= 30 ? 'warning' : 'active')
    : 'inactive'

  const card: React.CSSProperties = {
    background: 'var(--paper-light)', border: '1px solid var(--rule)',
    borderRadius: 'var(--radius)', padding: 24, marginBottom: 20,
  }
  const labelSm: React.CSSProperties = {
    fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const valueSm: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="pg-title">License</div>
        <div className="pg-sub">Software license management</div>
      </div>

      <div style={{ maxWidth: 640 }}>

        {/* Current License Status */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius)',
              background: licenseStatus === 'inactive' ? 'rgba(194,59,46,0.12)' : 'rgba(62,142,90,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {licenseStatus === 'inactive'
                ? <AlertTriangle size={18} style={{ color: 'var(--red-risk)' }} />
                : <ShieldCheck size={18} style={{ color: 'var(--green-ok)' }} />}
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 14,
                color: 'var(--blueprint)', textTransform: 'uppercase', letterSpacing: '0.03em',
              }}>Current License</div>
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
                { label: 'Expiry Date', value: license.expiryDate ? new Date(license.expiryDate).toLocaleDateString('en-PK') : 'Perpetual' },
                { label: 'Days Remaining', value: daysRemaining === null ? 'Perpetual' : daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days` },
                { label: 'Status', value: status?.message ?? '—' },
              ].map(item => (
                <div key={item.label}>
                  <div style={labelSm}>{item.label}</div>
                  <div style={{
                    ...valueSm,
                    color: item.label === 'Days Remaining' && (daysRemaining ?? 1) <= 30
                      ? 'var(--red-risk)' : 'var(--ink)',
                  }}>
                    {String(item.value ?? '—')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--steel)' }}>No active license found. Please activate below.</div>
          )}
        </div>

        {/* Activate Form */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--rule)' }}>
            <Key size={14} style={{ color: 'var(--orange)' }} />
            <h3 style={{
              fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 14,
              color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0,
            }}>Activate License</h3>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="field-label">License Key</label>
            <textarea
              className="field-input"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="MEDIX-eyJuIjoiQ..."
              spellCheck={false}
              rows={3}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'vertical' }}
            />
            <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>
              Paste the full license key provided by AbyteMedix support. All details are encoded in the key.
            </div>
          </div>

          <div style={{ paddingTop: 8 }}>
            <button
              onClick={() => activateMutation.mutate(licenseKey.trim())}
              disabled={activateMutation.isPending || !licenseKey.trim()}
              className="btn btn-primary"
            >
              {activateMutation.isPending && <Spinner size="sm" />}
              Activate License
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
