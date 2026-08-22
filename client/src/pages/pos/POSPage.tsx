import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, Plus, Minus, Search, ShoppingCart, User, ChevronDown } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

interface MedicineBatch {
  id: number
  batchNumber: string
  expiryDate: string
  currentQty: number
  saleRate: string
  medicine: {
    id: number
    brandName: string
    genericName: string
    strength: string
  }
}

interface CartItem {
  batchId: number
  batchNumber: string
  medicineName: string
  strength: string
  qty: number
  saleRate: number
  discount: number
  taxRate: number
  total: number
  maxQty: number
}

interface Customer {
  id: number
  name: string
  phone: string
  creditLimit: string
  outstandingBalance: string
}

interface HeldSale {
  id: string
  items: CartItem[]
  customer: Customer | null
  note?: string
  createdAt: string
}

function calcItemTotal(item: CartItem): number {
  const base = item.qty * item.saleRate
  const afterDisc = base - (base * item.discount) / 100
  const tax = (afterDisc * item.taxRate) / 100
  return +(afterDisc + tax).toFixed(2)
}

export default function POSPage() {
  const qc = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)

  const [searchQ, setSearchQ] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT'>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [lastInvoice, setLastInvoice] = useState<{ id: number; invoiceNumber: string } | null>(null)

  // Keyboard shortcut F2 to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ['med-search', searchQ],
    queryFn: () => api.get(`/medicines/search?q=${searchQ}`).then(r => r.data),
    enabled: searchQ.length >= 2,
  })

  const { data: customerResults } = useQuery({
    queryKey: ['cust-search', customerSearch],
    queryFn: () => api.get(`/customers?search=${customerSearch}&limit=8`).then(r => r.data),
    enabled: customerSearch.length >= 2,
  })

  const { data: heldSales, refetch: refetchHeld } = useQuery({
    queryKey: ['held-sales'],
    queryFn: () => api.get('/sales/held').then(r => r.data),
  })

  const subtotal = cart.reduce((s, i) => s + i.qty * i.saleRate, 0)
  const discountAmt = cart.reduce((s, i) => s + (i.qty * i.saleRate * i.discount) / 100, 0)
  const taxAmt = cart.reduce((s, i) => {
    const afterDisc = i.qty * i.saleRate - (i.qty * i.saleRate * i.discount) / 100
    return s + (afterDisc * i.taxRate) / 100
  }, 0)
  const total = +(subtotal - discountAmt + taxAmt).toFixed(2)
  const paid = parseFloat(amountPaid) || 0
  const change = +(paid - total).toFixed(2)

  const addToCart = useCallback((batch: MedicineBatch) => {
    setCart(prev => {
      const existing = prev.find(i => i.batchId === batch.id)
      if (existing) {
        return prev.map(i =>
          i.batchId === batch.id
            ? { ...i, qty: Math.min(i.qty + 1, i.maxQty), total: calcItemTotal({ ...i, qty: Math.min(i.qty + 1, i.maxQty) }) }
            : i
        )
      }
      const newItem: CartItem = {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        medicineName: `${batch.medicine.brandName} ${batch.medicine.strength}`,
        strength: batch.medicine.strength,
        qty: 1,
        saleRate: parseFloat(batch.saleRate),
        discount: 0,
        taxRate: 0,
        total: parseFloat(batch.saleRate),
        maxQty: batch.currentQty,
      }
      return [...prev, { ...newItem, total: calcItemTotal(newItem) }]
    })
    setSearchQ('')
    setShowResults(false)
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults?.length > 0) {
      const batch = searchResults[0]
      if (batch.batches?.length > 0) addToCart({ ...batch.batches[0], medicine: batch })
    }
  }

  const updateCartItem = (batchId: number, field: keyof CartItem, value: number) => {
    setCart(prev =>
      prev.map(i => {
        if (i.batchId !== batchId) return i
        const updated = { ...i, [field]: value }
        return { ...updated, total: calcItemTotal(updated) }
      })
    )
  }

  const removeFromCart = (batchId: number) => setCart(prev => prev.filter(i => i.batchId !== batchId))

  const saleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/sales', payload).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Sale completed! Invoice: ${data.invoiceNumber}`)
      setLastInvoice({ id: data.id, invoiceNumber: data.invoiceNumber })
      setCart([])
      setCustomer(null)
      setAmountPaid('')
      setNotes('')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Sale failed'),
  })

  const holdMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/sales/hold', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Sale held successfully')
      setCart([])
      setCustomer(null)
      refetchHeld()
    },
    onError: () => toast.error('Failed to hold sale'),
  })

  const deleteHeldMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sales/held/${id}`).then(r => r.data),
    onSuccess: () => { refetchHeld(); toast.success('Held sale removed') },
  })

  const completeSale = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    if (paymentMethod === 'CASH' && paid < total) { toast.error('Amount paid is less than total'); return }

    saleMutation.mutate({
      customerId: customer?.id,
      items: cart.map(i => ({
        batchId: i.batchId,
        quantity: i.qty,
        saleRate: i.saleRate,
        discount: i.discount,
        taxRate: i.taxRate,
        total: i.total,
      })),
      subtotal,
      discountAmount: discountAmt,
      taxAmount: taxAmt,
      total,
      amountPaid: paid || total,
      changeAmount: Math.max(0, change),
      paymentMethod,
      notes: notes || undefined,
    })
  }

  const holdSale = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    holdMutation.mutate({
      items: cart,
      customerId: customer?.id,
      total,
    })
  }

  const restoreHeld = (held: HeldSale) => {
    setCart(held.items)
    if (held.customer) setCustomer(held.customer)
    deleteHeldMutation.mutate(held.id)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT PANEL — Cart */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
        {/* Medicine Search */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setShowResults(true) }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowResults(true)}
              placeholder="Search medicine... (F2)"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>
            )}
            {showResults && searchQ.length >= 2 && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-30 max-h-64 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">No medicines found</p>
                ) : (
                  searchResults.map((med: any) =>
                    med.batches?.map((batch: MedicineBatch) => (
                      <button
                        key={batch.id}
                        onClick={() => addToCart({ ...batch, medicine: med })}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <span className="font-medium text-sm text-gray-900">{med.brandName}</span>
                          <span className="text-xs text-gray-500 ml-2">{med.strength} — Batch: {batch.batchNumber}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-blue-600">Rs. {batch.saleRate}</div>
                          <div className="text-xs text-gray-400">Stock: {batch.currentQty}</div>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCart size={48} />
              <p className="mt-3 text-sm">Cart is empty. Search a medicine to add.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Medicine</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Batch</th>
                  <th className="text-center px-3 py-2 text-xs text-gray-500 uppercase w-28">Qty</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase">Rate</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase w-20">Disc%</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500 uppercase">Total</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.batchId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{item.medicineName}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{item.batchNumber}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => item.qty > 1 && updateCartItem(item.batchId, 'qty', item.qty - 1)}
                          className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          min={1}
                          max={item.maxQty}
                          onChange={e => updateCartItem(item.batchId, 'qty', Math.min(Number(e.target.value), item.maxQty))}
                          className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => item.qty < item.maxQty && updateCartItem(item.batchId, 'qty', item.qty + 1)}
                          className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{item.saleRate.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.discount}
                        min={0}
                        max={100}
                        onChange={e => updateCartItem(item.batchId, 'discount', Number(e.target.value))}
                        className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ml-auto block"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      {item.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeFromCart(item.batchId)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span className="text-red-500">- Rs. {discountAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>Rs. {taxAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-1">
                <span>TOTAL</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 flex flex-col bg-white overflow-auto">
        <div className="p-4 space-y-4 flex-1">
          {/* Customer selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Customer</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={customer ? customer.name : customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value)
                  setCustomer(null)
                  setShowCustomerDrop(true)
                }}
                onFocus={() => setShowCustomerDrop(true)}
                placeholder="Walk-in customer..."
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {customer && (
                <button
                  onClick={() => { setCustomer(null); setCustomerSearch('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
              {showCustomerDrop && !customer && customerSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                  {(customerResults?.data ?? customerResults ?? []).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400">No customers found</p>
                  ) : (
                    (customerResults?.data ?? customerResults ?? []).map((c: Customer) => (
                      <button
                        key={c.id}
                        onClick={() => { setCustomer(c); setShowCustomerDrop(false) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.phone}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {customer && (
              <div className="mt-1 text-xs text-gray-500 flex gap-3">
                <span>Credit: Rs. {Number(customer.creditLimit).toLocaleString()}</span>
                <span className="text-red-500">Outstanding: Rs. {Number(customer.outstandingBalance).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-1">
              {(['CASH', 'CARD', 'CREDIT'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setPaymentMethod(m)
                    if (m === 'CASH') setAmountPaid(total.toFixed(2))
                    else if (m === 'CREDIT') setAmountPaid('0')
                  }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          {paymentMethod !== 'CREDIT' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount Paid</label>
              <input
                type="number"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-semibold text-lg"
              />
            </div>
          )}

          {/* Change */}
          {paymentMethod === 'CASH' && paid > 0 && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Change: Rs. {Math.abs(change).toFixed(2)} {change < 0 ? '(Short)' : ''}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Last Invoice */}
          {lastInvoice && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 font-semibold">Last Sale: {lastInvoice.invoiceNumber}</p>
              <button
                onClick={() => window.print()}
                className="mt-1 text-xs text-green-600 underline hover:text-green-800"
              >
                Print Invoice
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={holdSale}
              disabled={holdMutation.isPending || cart.length === 0}
              className="flex-1 border border-gray-300 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              {holdMutation.isPending ? 'Holding...' : 'HOLD'}
            </button>
            <button
              onClick={() => { setCart([]); setCustomer(null); setAmountPaid('') }}
              className="border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm hover:bg-red-50 font-medium"
            >
              CLEAR
            </button>
          </div>
          <button
            onClick={completeSale}
            disabled={saleMutation.isPending || cart.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saleMutation.isPending ? <><Spinner size="sm" /> Processing...</> : `COMPLETE SALE — Rs. ${total.toFixed(2)}`}
          </button>
        </div>

        {/* Held Sales */}
        {heldSales && heldSales.length > 0 && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-1 mb-2">
              <ChevronDown size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase">Held Sales ({heldSales.length})</p>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {heldSales.map((h: HeldSale) => (
                <div key={h.id} className="flex items-center justify-between text-xs bg-yellow-50 rounded-lg px-2 py-1.5">
                  <div>
                    <span className="font-medium text-gray-700">{h.items?.length ?? 0} items</span>
                    <span className="text-gray-400 ml-2">{new Date(h.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => restoreHeld(h)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => deleteHeldMutation.mutate(h.id)}
                      className="text-red-400 hover:text-red-600 ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
