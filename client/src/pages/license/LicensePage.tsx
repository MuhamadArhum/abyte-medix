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

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">License</h2>

      <div className="max-w-2xl space-y-6">
        {/* Current License */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            {licenseStatus === 'active' ? (
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-800">Current License</h3>
              <Badge
                label={licenseStatus === 'active' ? 'Active' : licenseStatus === 'warning' ? 'Expiring Soon' : 'Inactive'}
                variant={licenseStatus === 'active' ? 'green' : licenseStatus === 'warning' ? 'yellow' : 'red'}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : license ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Store Name', value: license.storeName },
                { label: 'Plan', value: license.plan },
                { label: 'Max POS Terminals', value: license.maxPos },
                { label: 'Expiry Date', value: license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : '—' },
                { label: 'Days Remaining', value: daysRemaining !== null ? `${daysRemaining} days` : '—' },
                { label: 'Status', value: status?.message ?? '—' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`font-semibold ${item.label === 'Days Remaining' && (daysRemaining ?? 0) <= 30 ? 'text-red-600' : 'text-gray-900'}`}>
                    {String(item.value ?? '—')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No active license found</p>
          )}
        </div>

        {/* Activate Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Activate License</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">License Key *</label>
              <input
                className={inputCls}
                value={form.licenseKey}
                onChange={e => set('licenseKey', e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Store Name</label>
              <input className={inputCls} value={form.storeName} onChange={e => set('storeName', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                <select className={inputCls} value={form.plan} onChange={e => set('plan', e.target.value)}>
                  <option value="BASIC">Basic</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max POS</label>
                <input type="number" className={inputCls} value={form.maxPos} onChange={e => set('maxPos', Number(e.target.value))} min={1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" className={inputCls} value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => activateMutation.mutate(form)}
                disabled={activateMutation.isPending || !form.licenseKey}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
