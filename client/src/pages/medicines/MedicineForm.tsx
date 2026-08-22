import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

interface MedicineFormData {
  productCode: string
  barcode: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  packSize: number
  unit: string
  taxRate: number
  reorderLevel: number
  prescriptionRequired: boolean
  categoryId: string
  manufacturerId: string
}

interface Props {
  initialData?: any
  onSuccess: () => void
  onCancel: () => void
}

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Patch', 'Suppository', 'Other']

export default function MedicineForm({ initialData, onSuccess, onCancel }: Props) {
  const isEdit = !!initialData

  const [form, setForm] = useState<MedicineFormData>({
    productCode: initialData?.productCode ?? '',
    barcode: initialData?.barcode ?? '',
    brandName: initialData?.brandName ?? '',
    genericName: initialData?.genericName ?? '',
    strength: initialData?.strength ?? '',
    dosageForm: initialData?.dosageForm ?? '',
    packSize: initialData?.packSize ?? 1,
    unit: initialData?.unit ?? 'Strip',
    taxRate: Number(initialData?.taxRate ?? 0),
    reorderLevel: initialData?.reorderLevel ?? 10,
    prescriptionRequired: initialData?.prescriptionRequired ?? false,
    categoryId: initialData?.categoryId ? String(initialData.categoryId) : '',
    manufacturerId: initialData?.manufacturerId ? String(initialData.manufacturerId) : '',
  })

  const set = (field: keyof MedicineFormData, value: string | number | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  })

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api.get('/manufacturers').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit
        ? api.patch(`/medicines/${initialData.id}`, payload).then(r => r.data)
        : api.post('/medicines', payload).then(r => r.data),
    onSuccess: () => {
      toast.success(isEdit ? 'Medicine updated' : 'Medicine added')
      onSuccess()
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brandName) { toast.error('Brand name is required'); return }
    mutation.mutate({
      ...form,
      packSize: Number(form.packSize),
      taxRate: Number(form.taxRate),
      reorderLevel: Number(form.reorderLevel),
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      manufacturerId: form.manufacturerId ? Number(form.manufacturerId) : undefined,
    })
  }

  const inputCls = 'field-input'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Product Code</label>
          <input className={inputCls} value={form.productCode} onChange={e => set('productCode', e.target.value)} placeholder="Auto-generated" />
        </div>
        <div>
          <label className="field-label">Barcode</label>
          <input className={inputCls} value={form.barcode} onChange={e => set('barcode', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Brand Name *</label>
          <input className={inputCls} value={form.brandName} onChange={e => set('brandName', e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Generic Name</label>
          <input className={inputCls} value={form.genericName} onChange={e => set('genericName', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Strength</label>
          <input className={inputCls} value={form.strength} onChange={e => set('strength', e.target.value)} placeholder="e.g. 500mg" />
        </div>
        <div>
          <label className="field-label">Dosage Form</label>
          <select className={inputCls} value={form.dosageForm} onChange={e => set('dosageForm', e.target.value)}>
            <option value="">Select...</option>
            {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Pack Size</label>
          <input type="number" className={inputCls} value={form.packSize} onChange={e => set('packSize', Number(e.target.value))} min={1} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Unit</label>
          <input className={inputCls} value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="Strip, Bottle..." />
        </div>
        <div>
          <label className="field-label">Tax Rate %</label>
          <input type="number" className={inputCls} value={form.taxRate} onChange={e => set('taxRate', Number(e.target.value))} min={0} max={100} />
        </div>
        <div>
          <label className="field-label">Reorder Level</label>
          <input type="number" className={inputCls} value={form.reorderLevel} onChange={e => set('reorderLevel', Number(e.target.value))} min={0} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Category</label>
          <select className={inputCls} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
            <option value="">None</option>
            {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Manufacturer</label>
          <select className={inputCls} value={form.manufacturerId} onChange={e => set('manufacturerId', e.target.value)}>
            <option value="">None</option>
            {(manufacturers ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="prescReq"
          checked={form.prescriptionRequired}
          onChange={e => set('prescriptionRequired', e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="prescReq" className="text-sm text-gray-700">Prescription Required</label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-primary disabled:opacity-50"
        >
          {mutation.isPending && <Spinner size="sm" />}
          {isEdit ? 'Save Changes' : 'Add Medicine'}
        </button>
      </div>
    </form>
  )
}
