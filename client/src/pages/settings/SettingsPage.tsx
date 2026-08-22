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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="space-y-3">{children}</div>
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

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {mutation.isPending && <Spinner size="sm" />}
          Save Settings
        </button>
      </div>

      <div className="max-w-2xl space-y-6">
        <Section title="Store Information">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store Name</label>
            <input className={inputCls} value={form.store_name ?? ''} onChange={e => set('store_name', e.target.value)} placeholder="AbyteMedix" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store Address</label>
            <textarea className={inputCls} value={form.store_address ?? ''} onChange={e => set('store_address', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store Phone</label>
            <input className={inputCls} value={form.store_phone ?? ''} onChange={e => set('store_phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store Logo URL</label>
            <input className={inputCls} value={form.store_logo ?? ''} onChange={e => set('store_logo', e.target.value)} placeholder="https://..." />
          </div>
        </Section>

        <Section title="Invoice Settings">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Prefix</label>
              <input className={inputCls} value={form.invoice_prefix ?? ''} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV-" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <input className={inputCls} value={form.currency ?? ''} onChange={e => set('currency', e.target.value)} placeholder="Rs." />
            </div>
          </div>
        </Section>

        <Section title="Alert Thresholds">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Low Stock Threshold</label>
              <input
                type="number"
                className={inputCls}
                value={form.low_stock_threshold ?? ''}
                onChange={e => set('low_stock_threshold', e.target.value)}
                min={0}
              />
              <p className="text-xs text-gray-400 mt-1">Alert when stock falls below this level</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Alert Days</label>
              <input
                type="number"
                className={inputCls}
                value={form.expiry_alert_days ?? ''}
                onChange={e => set('expiry_alert_days', e.target.value)}
                min={1}
              />
              <p className="text-xs text-gray-400 mt-1">Alert when medicine expires within these days</p>
            </div>
          </div>
        </Section>

        <Section title="Backup">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Backup Path</label>
            <input className={inputCls} value={form.backup_path ?? ''} onChange={e => set('backup_path', e.target.value)} placeholder="C:/backups/" />
          </div>
        </Section>
      </div>
    </div>
  )
}
