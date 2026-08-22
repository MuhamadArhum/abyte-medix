import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Search } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

interface PurchaseItem {
  medicineId: number
  medicineName: string
  batchNumber: string
  expiryDate: string
  purchaseRate: number
  saleRate: number
  quantity: number
  freeQty: number
  discount: number
  taxRate: number
  total: number
}

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function AddPurchaseForm({ onSuccess, onCancel }: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [showMedDrop, setShowMedDrop] = useState(false)

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers?limit=200').then(r => r.data),
  })

  const { data: medResults } = useQuery({
    queryKey: ['med-search-pur', medSearch],
    queryFn: () => api.get(`/medicines/search?q=${medSearch}`).then(r => r.data),
    enabled: medSearch.length >= 2,
  })

  const addItem = (med: any) => {
    setItems(prev => [...prev, {
      medicineId: med.id,
      medicineName: med.brandName,
      batchNumber: '',
      expiryDate: '',
      purchaseRate: 0,
      saleRate: 0,
      quantity: 1,
      freeQty: 0,
      discount: 0,
      taxRate: 0,
      total: 0,
    }])
    setMedSearch('')
    setShowMedDrop(false)
  }

  const updateItem = (idx: number, field: keyof PurchaseItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      const base = updated.quantity * updated.purchaseRate
      const afterDisc = base - (base * updated.discount) / 100
      const tax = (afterDisc * updated.taxRate) / 100
      updated.total = +(afterDisc + tax).toFixed(2)
      return updated
    }))
  }

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, i) => s + i.quantity * i.purchaseRate, 0)
  const totalDiscount = items.reduce((s, i) => s + (i.quantity * i.purchaseRate * i.discount) / 100, 0)
  const totalTax = items.reduce((s, i) => {
    const base = i.quantity * i.purchaseRate
    const afterDisc = base - (base * i.discount) / 100
    return s + (afterDisc * i.taxRate) / 100
  }, 0)
  const grandTotal = +(subtotal - totalDiscount + totalTax).toFixed(2)

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/purchases', payload).then(r => r.data),
    onSuccess: () => { toast.success('Purchase recorded'); onSuccess() },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save purchase'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) { toast.error('Select a supplier'); return }
    if (items.length === 0) { toast.error('Add at least one item'); return }

    mutation.mutate({
      supplierId: Number(supplierId),
      purchaseDate,
      invoiceNumber: invoiceNumber || undefined,
      items: items.map(i => ({
        medicineId: i.medicineId,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate || undefined,
        purchaseRate: i.purchaseRate,
        saleRate: i.saleRate,
        quantity: i.quantity,
        freeQty: i.freeQty,
        discount: i.discount,
        taxRate: i.taxRate,
        total: i.total,
      })),
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      amountPaid: parseFloat(amountPaid) || grandTotal,
      notes: notes || undefined,
    })
  }

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header fields */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Supplier *</label>
          <select className={inputCls} value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
            <option value="">Select supplier...</option>
            {(suppliers?.data ?? suppliers ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date</label>
          <input type="date" className={inputCls} value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Invoice #</label>
          <input className={inputCls} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {/* Medicine search */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Add Medicine</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className={`${inputCls} pl-8`}
            value={medSearch}
            onChange={e => { setMedSearch(e.target.value); setShowMedDrop(true) }}
            onFocus={() => setShowMedDrop(true)}
            placeholder="Search medicine to add..."
          />
          {showMedDrop && medSearch.length >= 2 && medResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
              {medResults.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">No results</p>
              ) : (
                medResults.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addItem(m)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                  >
                    {m.brandName} <span className="text-xs text-gray-400">{m.strength}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Medicine', 'Batch #', 'Expiry', 'P.Rate', 'S.Rate', 'Qty', 'Free', 'Disc%', 'Tax%', 'Total', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-left text-gray-500 uppercase font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t border-gray-100">
                  <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">{item.medicineName}</td>
                  {(['batchNumber', 'expiryDate'] as const).map(f => (
                    <td key={f} className="px-2 py-1.5">
                      <input
                        type={f === 'expiryDate' ? 'date' : 'text'}
                        className="border border-gray-200 rounded px-1.5 py-1 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item[f]}
                        onChange={e => updateItem(idx, f, e.target.value)}
                      />
                    </td>
                  ))}
                  {(['purchaseRate', 'saleRate', 'quantity', 'freeQty', 'discount', 'taxRate'] as const).map(f => (
                    <td key={f} className="px-2 py-1.5">
                      <input
                        type="number"
                        className="border border-gray-200 rounded px-1.5 py-1 w-16 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item[f]}
                        min={0}
                        onChange={e => updateItem(idx, f, Number(e.target.value))}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{item.total.toFixed(2)}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals & payment */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid</label>
            <input
              type="number"
              className={inputCls}
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              placeholder={grandTotal.toFixed(2)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm self-end">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Discount</span><span className="text-red-500">- Rs. {totalDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Tax</span><span>Rs. {totalTax.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-gray-900 border-t pt-1 text-base"><span>TOTAL</span><span>Rs. {grandTotal.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {mutation.isPending && <Spinner size="sm" />}
          Save Purchase
        </button>
      </div>
    </form>
  )
}
