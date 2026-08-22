import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

interface Props {
  initialData?: any
  onSuccess: () => void
  onCancel: () => void
}

export default function SupplierForm({ initialData, onSuccess, onCancel }: Props) {
  const isEdit = !!initialData
  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    contactPerson: initialData?.contactPerson ?? '',
    phone: initialData?.phone ?? '',
    email: initialData?.email ?? '',
    address: initialData?.address ?? '',
    ntn: initialData?.ntn ?? '',
  })

  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? api.patch(`/suppliers/${initialData.id}`, payload).then(r => r.data)
        : api.post('/suppliers', payload).then(r => r.data),
    onSuccess: () => { toast.success(isEdit ? 'Supplier updated' : 'Supplier added'); onSuccess() },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Name is required'); return }
    mutation.mutate(form)
  }

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
          <input className={inputCls} value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">NTN</label>
          <input className={inputCls} value={form.ntn} onChange={e => set('ntn', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
        <textarea className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {mutation.isPending && <Spinner size="sm" />}
          {isEdit ? 'Save' : 'Add Supplier'}
        </button>
      </div>
    </form>
  )
}
