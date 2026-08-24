import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, ShoppingCart, X,
  Receipt, RotateCcw, CheckCircle2, Printer, User,
  Barcode, Hash, Pill as PillIcon, Keyboard,
} from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import PrintA4, { type SaleReceiptData } from '../../components/ui/PrintA4'

const C = {
  primary: '#E85D1F', primaryDark: '#C24A16',
  bg: '#ECE8DB', card: '#F5F2E8', border: '#D3CDBA',
  text: '#14181B', subtext: '#6B7178', faint: '#6B7178',
  danger: '#C23B2E', dangerBg: 'rgba(194,59,46,0.10)',
  warn: '#C98A1E', warnBg: 'rgba(201,138,30,0.12)',
  expiry: '#C23B2E', expiryBg: 'rgba(194,59,46,0.10)',
}
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
const EXPIRY_WARN_DAYS = 60

const inputStyle: React.CSSProperties = {
  padding: '8px 11px', borderRadius: 'var(--radius)', border: `1px solid ${C.border}`,
  fontSize: 13, outline: 'none', background: '#fff',
  fontFamily: 'var(--font-sans)',
}

/* ── Keyboard shortcut reference ── */
const SHORTCUTS = [
  { group: 'F1 – F4', items: [
    { key: 'F1', desc: 'Show / hide this help panel' },
    { key: 'F2', desc: 'Focus medicine search' },
    { key: 'F3', desc: 'Focus customer field' },
    { key: 'F4', desc: 'Hold current sale' },
  ]},
  { group: 'F5 – F8', items: [
    { key: 'F5', desc: 'Clear entire cart' },
    { key: 'F6', desc: 'Focus amount paid field' },
    { key: 'F7', desc: 'Print last receipt (A4)' },
    { key: 'F8', desc: 'Complete sale — Checkout' },
  ]},
  { group: 'Search & Cart', items: [
    { key: '↑ ↓', desc: 'Navigate search results' },
    { key: 'Enter', desc: 'Add highlighted medicine' },
    { key: 'Tab', desc: 'Qty → Disc → Search → Customer → Payment → Amount → Checkout' },
    { key: 'Esc', desc: 'Close dropdown / modal' },
  ]},
  { group: 'Cart Edit', items: [
    { key: 'Ctrl + ↑', desc: 'Increase qty — last item' },
    { key: 'Ctrl + ↓', desc: 'Decrease qty — last item' },
    { key: 'Ctrl + Del', desc: 'Remove last cart item' },
  ]},
]

function KbdTag({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--blueprint)', color: '#fff', borderRadius: 'var(--radius)',
      padding: '2px 7px', fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--font-mono)',
      minWidth: 28, whiteSpace: 'nowrap',
    }}>
      {children}
    </kbd>
  )
}

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8,27,48,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 80, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--paper-light)', borderRadius: 'var(--radius)', width: 640, maxHeight: '80vh',
        overflowY: 'auto', padding: 28, boxShadow: '0 16px 48px rgba(8,27,48,0.25)',
        border: '1px solid var(--rule)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Keyboard size={20} color={C.primary} />
            <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Keyboard Shortcuts — POS</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {SHORTCUTS.map(group => (
            <div key={group.group}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
                color: C.primary, marginBottom: 10, paddingBottom: 6,
                borderBottom: `2px solid ${C.border}`,
              }}>
                {group.group}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.subtext }}>{item.desc}</span>
                    <KbdTag>{item.key}</KbdTag>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 22, padding: '10px 14px', background: C.bg, borderRadius: 8,
          fontSize: 12, color: C.faint, textAlign: 'center',
        }}>
          Press <KbdTag>F1</KbdTag> anytime to toggle this panel · <KbdTag>Esc</KbdTag> to close
        </div>
      </div>
    </div>
  )
}

/* ── Bottom shortcut bar ── */
function ShortcutBar({ onHelp }: { onHelp: () => void }) {
  const chips: { key: string; label: string }[] = [
    { key: 'F1', label: 'Help' },
    { key: 'F2', label: 'Search' },
    { key: 'F3', label: 'Customer' },
    { key: 'F4', label: 'Hold' },
    { key: 'F5', label: 'Clear' },
    { key: 'F6', label: 'Amount' },
    { key: 'F7', label: 'Print' },
    { key: 'F8', label: 'Checkout' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 200, right: 0,
      background: 'var(--blueprint-deep)', padding: '6px 16px',
      display: 'flex', alignItems: 'center', gap: 4, zIndex: 30, flexWrap: 'wrap',
    }}>
      {chips.map(c => (
        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
          <span style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            borderRadius: 4, padding: '1px 6px', fontSize: 10.5, fontWeight: 700,
            fontFamily: 'monospace',
          }}>{c.key}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{c.label}</span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto' }}>
        <button onClick={onHelp} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '3px 10px',
          fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Keyboard size={11} /> F1 Help
        </button>
      </div>
    </div>
  )
}

interface MedicineBatch {
  id: number; batchNumber: string; expiryDate: string
  currentQty: number; quantity?: number; saleRate: string
}
interface Medicine {
  id: number; brandName: string; genericName: string; strength: string
  category?: string | { name: string }
  barcode?: string; productCode?: string
  batches: MedicineBatch[]
}
interface DropdownItem { med: Medicine; batch: MedicineBatch; matchType: 'name' | 'barcode' | 'code' }
interface CartItem {
  batchId: number; batchNumber: string; medicineName: string; strength: string
  productCode: string
  qty: number; saleRate: number; discount: number; taxRate: number; total: number; maxQty: number
}
interface Customer {
  id: number; name: string; phone: string; creditLimit: string; outstandingBalance: string
}
interface HeldSale {
  id: number; items: any[]; customer: Customer | null; createdAt: string
}

function calcItemTotal(item: CartItem): number {
  const base = item.qty * item.saleRate
  const afterDisc = base - (base * item.discount) / 100
  return +(afterDisc + (afterDisc * item.taxRate) / 100).toFixed(2)
}
function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}
function fmtRs(n: number) { return 'Rs ' + Math.round(n || 0).toLocaleString('en-PK') }
function batchQty(b: MedicineBatch) { return b.currentQty ?? b.quantity ?? 0 }
function getMatchType(med: Medicine, q: string): 'barcode' | 'code' | 'name' {
  const lq = q.toLowerCase()
  if (med.barcode && med.barcode.toLowerCase().includes(lq)) return 'barcode'
  if (med.productCode && med.productCode.toLowerCase().includes(lq)) return 'code'
  return 'name'
}

export default function POSPage() {
  const qc = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLInputElement>(null)
  const amountPaidRef = useRef<HTMLInputElement>(null)
  const cashBtnRef = useRef<HTMLButtonElement | null>(null)
  const creditBtnRef = useRef<HTMLButtonElement | null>(null)
  const checkoutBtnRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const rowQtyRefs = useRef<(HTMLInputElement | null)[]>([])
  const rowDiscRefs = useRef<(HTMLInputElement | null)[]>([])
  const prevCartLen = useRef(0)

  const [searchQ, setSearchQ] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const [highlightedCustomerIdx, setHighlightedCustomerIdx] = useState(-1)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [receipt, setReceipt] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [printData, setPrintData] = useState<SaleReceiptData | null>(null)
  const [activeQuotationId, setActiveQuotationId] = useState<number | null>(null)

  /* ── Load quotation from Quotations page ── */
  useEffect(() => {
    const raw = sessionStorage.getItem('pos_load_quotation')
    if (!raw) return
    sessionStorage.removeItem('pos_load_quotation')
    try {
      const q = JSON.parse(raw)
      const items = apiItemsToCart(q.items ?? [])
      if (items.length > 0) {
        setCart(items)
        if (q.customer) setCustomer(q.customer)
        toast.success(`Quotation ${q.invoiceNumber} loaded into cart`)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Auto-focus qty input when new item added ── */
  useEffect(() => {
    if (cart.length > prevCartLen.current) {
      const lastIdx = cart.length - 1
      setTimeout(() => rowQtyRefs.current[lastIdx]?.select(), 30)
    }
    prevCartLen.current = cart.length
  }, [cart.length])

  /* ── Global keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select'

      // F1 — toggle help (always)
      if (e.key === 'F1') {
        e.preventDefault()
        setShowHelp(v => !v)
        return
      }

      // Escape — close help / receipt / dropdown
      if (e.key === 'Escape') {
        if (showHelp) { setShowHelp(false); return }
        if (receipt) { newSaleRef.current?.(); return }
        setShowDropdown(false)
        setHighlightedIdx(-1)
        return
      }

      // Enter — dismiss receipt modal → new sale
      if (e.key === 'Enter' && receipt && !inInput) {
        e.preventDefault()
        newSaleRef.current?.()
        return
      }

      // F2 — focus search (also dismisses receipt modal)
      if (e.key === 'F2') {
        e.preventDefault()
        if (receipt) { newSaleRef.current?.(); return }
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }

      // F3 — focus customer field
      if (e.key === 'F3') {
        e.preventDefault()
        customerRef.current?.focus()
        customerRef.current?.select()
        return
      }

      // F4 — hold sale
      if (e.key === 'F4') {
        e.preventDefault()
        holdSaleRef.current?.()
        return
      }

      // F5 — clear cart
      if (e.key === 'F5') {
        e.preventDefault()
        clearCartRef.current?.()
        return
      }

      // F6 — focus amount paid
      if (e.key === 'F6') {
        e.preventDefault()
        amountPaidRef.current?.focus()
        amountPaidRef.current?.select()
        return
      }

      // F7 — print last receipt
      if (e.key === 'F7') {
        e.preventDefault()
        if (lastReceipt) {
          setPrintData(lastReceipt)
          setTimeout(() => window.print(), 120)
        }
        return
      }

      // F8 — checkout
      if (e.key === 'F8') {
        e.preventDefault()
        completeSaleRef.current?.()
        return
      }

      // Ctrl+Delete — remove last cart item
      if (e.ctrlKey && e.key === 'Delete') {
        e.preventDefault()
        removeLastRef.current?.()
        return
      }

      // Ctrl+ArrowUp — increase qty of last cart item
      if (e.ctrlKey && e.key === 'ArrowUp' && !inInput) {
        e.preventDefault()
        adjustLastRef.current?.(1)
        return
      }

      // Ctrl+ArrowDown — decrease qty of last cart item
      if (e.ctrlKey && e.key === 'ArrowDown' && !inInput) {
        e.preventDefault()
        adjustLastRef.current?.(-1)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showHelp, lastReceipt, receipt])

  // Stable refs for actions (avoids stale closure issues)
  const holdSaleRef = useRef<(() => void) | null>(null)
  const clearCartRef = useRef<(() => void) | null>(null)
  const completeSaleRef = useRef<(() => void) | null>(null)
  const newSaleRef = useRef<(() => void) | null>(null)
  const setPaymentMethodRef = useRef<((m: 'CASH' | 'CREDIT') => void) | null>(null)
  const removeLastRef = useRef<(() => void) | null>(null)
  const adjustLastRef = useRef<((delta: number) => void) | null>(null)

  // Outside click — close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  // Search results
  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ['med-search', searchQ],
    queryFn: () => api.get(`/medicines/search?q=${encodeURIComponent(searchQ)}`).then(r => r.data as Medicine[]),
    enabled: searchQ.trim().length >= 1,
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

  const { data: quotations, refetch: refetchQuotations } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api.get('/sales/quotations').then(r => r.data),
  })

  // Flat dropdown items
  const dropdownItems = useMemo<DropdownItem[]>(() => {
    if (!searchQ.trim()) return []
    const results: Medicine[] = searchResults ?? []
    const items: DropdownItem[] = []
    results.forEach(med => {
      const avail = (med.batches ?? []).filter(b => batchQty(b) > 0)
      if (avail.length === 0) {
        if (med.batches?.[0]) items.push({ med, batch: med.batches[0], matchType: getMatchType(med, searchQ) })
      } else {
        avail.forEach(batch => items.push({ med, batch, matchType: getMatchType(med, searchQ) }))
      }
    })
    return items
  }, [searchResults, searchQ])

  useEffect(() => {
    if (dropdownItems.length > 0 && showDropdown) setHighlightedIdx(0)
    else setHighlightedIdx(-1)
  }, [dropdownItems, showDropdown])

  useEffect(() => {
    const el = itemRefs.current[highlightedIdx]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [highlightedIdx])

const subtotal = cart.reduce((s, i) => s + i.qty * i.saleRate, 0)
  const discountAmt = cart.reduce((s, i) => s + (i.qty * i.saleRate * i.discount) / 100, 0)
  const taxAmt = cart.reduce((s, i) => {
    const afterDisc = i.qty * i.saleRate - (i.qty * i.saleRate * i.discount) / 100
    return s + (afterDisc * i.taxRate) / 100
  }, 0)
  const total = +(subtotal - discountAmt + taxAmt).toFixed(2)
  const paid = parseFloat(amountPaid) || 0
  const change = +(paid - total).toFixed(2)

  const addToCart = useCallback((med: Medicine, batch: MedicineBatch) => {
    const qty = batchQty(batch)
    if (qty <= 0) { toast.error(`${med.brandName} is out of stock`); return }
    setCart(prev => {
      const existing = prev.find(i => i.batchId === batch.id)
      if (existing) {
        if (existing.qty >= existing.maxQty) { toast.warning('Max stock reached'); return prev }
        return prev.map(i => i.batchId === batch.id
          ? { ...i, qty: i.qty + 1, total: calcItemTotal({ ...i, qty: i.qty + 1 }) }
          : i
        )
      }
      const newItem: CartItem = {
        batchId: batch.id, batchNumber: batch.batchNumber,
        medicineName: `${med.brandName} ${med.strength}`,
        productCode: med.productCode ?? '',
        strength: med.strength, qty: 1,
        saleRate: parseFloat(batch.saleRate), discount: 0, taxRate: 0,
        total: parseFloat(batch.saleRate), maxQty: qty,
      }
      return [...prev, { ...newItem, total: calcItemTotal(newItem) }]
    })
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || dropdownItems.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(p => Math.min(p + 1, dropdownItems.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(p => Math.max(p - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const item = dropdownItems[highlightedIdx >= 0 ? highlightedIdx : 0]
      if (item) { addToCart(item.med, item.batch); setSearchQ(''); setShowDropdown(false); setHighlightedIdx(-1); searchRef.current?.focus() }
    } else if (e.key === 'Escape') { setShowDropdown(false); setHighlightedIdx(-1) }
  }

  const selectDropdownItem = (item: DropdownItem) => {
    addToCart(item.med, item.batch)
    setSearchQ(''); setShowDropdown(false); setHighlightedIdx(-1)
    searchRef.current?.focus()
  }

  const changeQty = (batchId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.batchId !== batchId) return i
      const qty = Math.min(i.maxQty, Math.max(1, i.qty + delta))
      return { ...i, qty, total: calcItemTotal({ ...i, qty }) }
    }))
  }

  const removeFromCart = (batchId: number) => setCart(prev => prev.filter(i => i.batchId !== batchId))

  const setQty = (batchId: number, val: number) => {
    setCart(prev => prev.map(i => {
      if (i.batchId !== batchId) return i
      const qty = Math.min(i.maxQty, Math.max(1, val || 1))
      return { ...i, qty, total: calcItemTotal({ ...i, qty }) }
    }))
  }

  const setDiscount = (batchId: number, val: number) => {
    setCart(prev => prev.map(i => {
      if (i.batchId !== batchId) return i
      const discount = Math.min(100, Math.max(0, val || 0))
      return { ...i, discount, total: calcItemTotal({ ...i, discount }) }
    }))
  }

  const setRate = (batchId: number, val: number) => {
    setCart(prev => prev.map(i => {
      if (i.batchId !== batchId) return i
      const saleRate = Math.max(0, val || 0)
      return { ...i, saleRate, total: calcItemTotal({ ...i, saleRate }) }
    }))
  }

  const saleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/sales', payload).then(r => r.data),
    onSuccess: (data) => {
      const rec = {
        invoiceNumber: data.invoiceNumber, date: new Date(),
        customerName: customer?.name ?? 'Walk-in Customer',
        lines: cart, subtotal, discountAmt, taxAmt, total,
        paid: paid || total, change: Math.max(0, change), paymentMethod,
      }
      setReceipt(rec)
      setLastReceipt(rec)
      setCart([]); setCustomer(null); setAmountPaid(''); setNotes('')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['pos-grid'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Sale failed'),
  })

  const holdMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/sales/hold', payload).then(r => r.data),
    onSuccess: () => { toast.success('Sale held'); setCart([]); setCustomer(null); setAmountPaid(''); refetchHeld(); refetchQuotations() },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to hold sale'),
  })

  const deleteHeldMutation = useMutation({
    mutationFn: (id: string | number) => api.delete(`/sales/held/${id}`).then(r => r.data),
    onSuccess: () => refetchHeld(),
  })

  const quotationMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/sales/quotations', payload).then(r => r.data),
    onSuccess: () => { toast.success('Quotation saved'); refetchQuotations() },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to save quotation'),
  })

  const deleteQuotationMutation = useMutation({
    mutationFn: (id: string | number) => api.delete(`/sales/quotations/${id}`).then(r => r.data),
    onSuccess: () => refetchQuotations(),
  })

  const cartPayload = () => ({
    customerId: customer?.id,
    items: cart.map(i => ({ batchId: i.batchId, qty: i.qty, saleRate: i.saleRate, discount: i.discount, taxRate: i.taxRate, total: i.total })),
    subtotal, discountAmount: discountAmt, taxAmount: taxAmt, total,
    notes: notes || undefined,
  })

  // Bind action refs (updated each render so shortcuts use fresh state)
  const completeSale = () => {
    if (cart.length === 0) { toast.error('Cart is empty (F2 to search)'); return }
    const effectivePaid = parseFloat(amountPaid) || total
    if (paymentMethod === 'CASH' && effectivePaid < total) { toast.error('Amount paid is less than total (F6 to enter)'); return }
    saleMutation.mutate({
      customerId: customer?.id,
      items: cart.map(i => ({ batchId: i.batchId, quantity: i.qty, saleRate: i.saleRate, discount: i.discount, taxRate: i.taxRate, total: i.total })),
      subtotal, discountAmount: discountAmt, taxAmount: taxAmt, total,
      amountPaid: effectivePaid, changeAmount: Math.max(0, effectivePaid - total), paymentMethod,
      notes: notes || undefined,
      quotationId: activeQuotationId ?? undefined,
    })
  }
  completeSaleRef.current = completeSale

  const holdSale = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    holdMutation.mutate(cartPayload())
  }
  holdSaleRef.current = holdSale

  const clearCart = () => {
    if (cart.length === 0) return
    setCart([]); setCustomer(null); setAmountPaid(''); setActiveQuotationId(null)
    toast.info('Cart cleared')
    searchRef.current?.focus()
  }
  clearCartRef.current = clearCart

  const setPaymentMethodAction = (m: 'CASH' | 'CREDIT') => {
    setPaymentMethod(m)
    if (m === 'CASH') { setAmountPaid(total.toFixed(2)) }
    else if (m === 'CREDIT') setAmountPaid('0')
  }
  setPaymentMethodRef.current = setPaymentMethodAction

  removeLastRef.current = () => {
    if (cart.length === 0) return
    const last = cart[cart.length - 1]
    setCart(prev => prev.slice(0, -1))
    toast.info(`Removed: ${last.medicineName}`)
  }

  adjustLastRef.current = (delta: number) => {
    if (cart.length === 0) return
    const last = cart[cart.length - 1]
    changeQty(last.batchId, delta)
  }

  const apiItemsToCart = (apiItems: any[]): CartItem[] =>
    (apiItems ?? []).map((i: any) => ({
      batchId: i.batchId ?? i.batch?.id,
      batchNumber: i.batch?.batchNumber ?? '',
      medicineName: i.batch?.medicine ? `${i.batch.medicine.brandName} ${i.batch.medicine.strength ?? ''}`.trim() : 'Unknown',
      strength: i.batch?.medicine?.strength ?? '',
      productCode: i.batch?.medicine?.productCode ?? '',
      qty: i.quantity ?? i.qty ?? 1,
      saleRate: parseFloat(i.saleRate) || 0,
      discount: i.discount ?? 0,
      taxRate: i.taxRate ?? 0,
      total: parseFloat(i.total) || 0,
      maxQty: i.batch?.quantity ?? i.maxQty ?? 999,
    }))

  const restoreHeld = (held: any) => {
    setCart(apiItemsToCart(held.items))
    if (held.customer) setCustomer(held.customer)
    deleteHeldMutation.mutate(held.id)
  }

  const saveQuotation = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    quotationMutation.mutate(cartPayload())
  }

  const restoreQuotation = (quot: any) => {
    setCart(apiItemsToCart(quot.items))
    if (quot.customer) setCustomer(quot.customer)
    setActiveQuotationId(quot.id)
    toast.success('Quotation loaded into cart')
  }

  const newSale = () => {
    setReceipt(null)
    setActiveQuotationId(null)
    setTimeout(() => { searchRef.current?.focus(); searchRef.current?.select() }, 80)
  }
  newSaleRef.current = newSale

  const tblTh: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff',
    background: C.primary, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
  }
  const tblTd: React.CSSProperties = {
    padding: '5px 8px', borderBottom: `1px solid ${C.border}`, fontSize: 13, verticalAlign: 'middle',
  }
  const numInput: React.CSSProperties = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '3px 0',
    color: C.text,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden', background: C.bg }}>

      {/* ── TOP BAR: Search + Customer ── */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 16px', background: '#fff', borderBottom: `1px solid ${C.border}`, flexShrink: 0, alignItems: 'flex-start' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={17} style={{ position: 'absolute', left: 13, top: 13, color: C.faint, pointerEvents: 'none' }} />
          <input
            ref={searchRef}
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setShowDropdown(true); setHighlightedIdx(-1) }}
            onFocus={() => { if (searchQ.trim()) setShowDropdown(true) }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by name, product code or scan barcode… (F2)"
            style={{
              width: '100%', padding: '11px 40px 11px 42px', borderRadius: 10,
              border: `1px solid ${showDropdown && searchQ ? C.primary : C.border}`,
              fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
          />
          {!searchQ && (
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 5 }}>
              {[['🔹', 'Name'], ['#', 'Code'], ['|||', 'Barcode']].map(([icon, label]) => (
                <span key={label} style={{ fontSize: 10, color: C.faint, background: C.bg, padding: '2px 6px', borderRadius: 5 }}>
                  {icon} {label}
                </span>
              ))}
            </div>
          )}
          {searchLoading && (
            <div style={{ position: 'absolute', right: 12, top: 13 }}><Spinner size="sm" /></div>
          )}

          {/* ── Dropdown ── */}
          {showDropdown && searchQ.trim().length >= 1 && (
            <div ref={dropdownRef} style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
              background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12,
              boxShadow: '0 8px 24px rgba(11,110,92,0.12)', zIndex: 40,
              maxHeight: 360, overflowY: 'auto',
            }}>
              <div style={{
                padding: '8px 14px 6px', fontSize: 10.5, fontWeight: 700,
                color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5,
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{dropdownItems.length} result{dropdownItems.length !== 1 ? 's' : ''}</span>
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  ↑↓ navigate · Enter select · Esc close
                </span>
              </div>

              {searchLoading && dropdownItems.length === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
              )}
              {!searchLoading && dropdownItems.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: C.faint, fontSize: 13 }}>
                  No medicines found for "<strong>{searchQ}</strong>"
                </div>
              )}

              {dropdownItems.map((item, idx) => {
                const { med, batch, matchType } = item
                const qty = batchQty(batch)
                const isOut = qty <= 0
                const expDays = daysUntil(batch.expiryDate)
                const nearExp = expDays <= EXPIRY_WARN_DAYS
                const isHi = idx === highlightedIdx

                return (
                  <button
                    key={`${med.id}-${batch.id}`}
                    ref={el => { itemRefs.current[idx] = el }}
                    onClick={() => !isOut && selectDropdownItem(item)}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none',
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                      background: isHi ? '#E8F6F1' : '#fff',
                      borderBottom: `1px solid ${C.border}`,
                      opacity: isOut ? 0.55 : 1, transition: 'background 0.08s',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: isHi ? C.primary : C.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.08s',
                    }}>
                      {matchType === 'barcode' ? <Barcode size={14} color={isHi ? '#fff' : C.subtext} />
                        : matchType === 'code' ? <Hash size={14} color={isHi ? '#fff' : C.subtext} />
                        : <PillIcon size={14} color={isHi ? '#fff' : C.subtext} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{med.brandName}</span>
                        <span style={{ fontSize: 11.5, color: C.subtext }}>{med.strength}</span>
                        {med.productCode && (
                          <span style={{ fontSize: 10, color: C.faint, ...MONO, background: C.bg, padding: '1px 5px', borderRadius: 4 }}>
                            {med.productCode}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.subtext, marginTop: 2 }}>{med.genericName}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                        <span style={{ fontSize: 10.5, color: C.faint, ...MONO }}>Batch {batch.batchNumber}</span>
                        <span style={{ fontSize: 10.5, color: C.faint }}>Exp {batch.expiryDate?.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.primary, ...MONO }}>
                        {fmtRs(parseFloat(batch.saleRate))}
                      </div>
                      {isOut
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: C.danger, background: C.dangerBg, padding: '1px 6px', borderRadius: 5 }}>Out of stock</span>
                        : nearExp
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: C.expiry, background: C.expiryBg, padding: '1px 6px', borderRadius: 5 }}>{qty} · Exp {expDays}d</span>
                        : <span style={{ fontSize: 10.5, color: C.subtext }}>Stock: {qty}</span>
                      }
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Customer field */}
        <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
          <User size={14} style={{ position: 'absolute', left: 10, top: 10, color: C.faint, zIndex: 1 }} />
          <input
            ref={customerRef}
            type="text"
            value={customer ? customer.name : customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setCustomer(null); setShowCustomerDrop(true) }}
            onFocus={() => setShowCustomerDrop(true)}
            onKeyDown={e => {
              const custList: Customer[] = customerResults?.data ?? customerResults ?? []
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setShowCustomerDrop(true)
                setHighlightedCustomerIdx(p => Math.min(p + 1, custList.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightedCustomerIdx(p => Math.max(p - 1, 0))
              } else if (e.key === 'Enter') {
                if (showCustomerDrop && custList.length > 0) {
                  e.preventDefault()
                  const idx = highlightedCustomerIdx >= 0 ? highlightedCustomerIdx : 0
                  const c = custList[idx]
                  if (c) { setCustomer(c); setShowCustomerDrop(false); setHighlightedCustomerIdx(-1); setTimeout(() => cashBtnRef.current?.focus(), 30) }
                } else if (!showCustomerDrop) {
                  e.preventDefault()
                  cashBtnRef.current?.focus()
                }
              } else if (e.key === 'Escape') {
                setShowCustomerDrop(false); setHighlightedCustomerIdx(-1)
              } else if (e.key === 'Tab') {
                e.preventDefault()
                setShowCustomerDrop(false)
                setHighlightedCustomerIdx(-1)
                cashBtnRef.current?.focus()
              }
            }}
            placeholder="Customer… (F3)"
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 30 }}
          />
          {customer && (
            <button onClick={() => { setCustomer(null); setCustomerSearch('') }}
              style={{ position: 'absolute', right: 8, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: C.faint }}>
              <X size={13} />
            </button>
          )}
          {showCustomerDrop && !customer && customerSearch.length >= 2 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: 160, overflowY: 'auto',
            }}>
              {(customerResults?.data ?? customerResults ?? []).map((c: Customer, cidx: number) => {
                const isHi = cidx === highlightedCustomerIdx
                return (
                  <button key={c.id}
                    onClick={() => {
                      setCustomer(c); setShowCustomerDrop(false); setHighlightedCustomerIdx(-1)
                      setTimeout(() => cashBtnRef.current?.focus(), 30)
                    }}
                    onMouseEnter={() => setHighlightedCustomerIdx(cidx)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                      background: isHi ? C.bg : '#fff', cursor: 'pointer', display: 'block',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.faint }}>{c.phone}</div>
                  </button>
                )
              })}
            </div>
          )}
          {customer && (
            <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3, display: 'flex', gap: 10, paddingLeft: 2 }}>
              <span>Credit: Rs {Number(customer.creditLimit).toLocaleString()}</span>
              <span style={{ color: C.danger }}>Due: Rs {Number(customer.outstandingBalance).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Item count badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
          <ShoppingCart size={15} color={C.primary} />
          <span style={{ fontSize: 12, background: '#E8F6F1', color: C.primary, padding: '2px 10px', borderRadius: 999, fontWeight: 700 }}>
            {cart.reduce((s, i) => s + i.qty, 0)} items
          </span>
        </div>
      </div>{/* end top bar */}

      {/* ── MIDDLE: Cart Table + Payment Panel ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Cart Table */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...tblTh, width: 38 }}>#</th>
                <th style={{ ...tblTh, width: 90 }}>Code</th>
                <th style={{ ...tblTh }}>Medicine</th>
                <th style={{ ...tblTh, width: 80, textAlign: 'right' }}>Qty</th>
                <th style={{ ...tblTh, width: 90, textAlign: 'right' }}>Rate</th>
                <th style={{ ...tblTh, width: 70, textAlign: 'right' }}>Disc%</th>
                <th style={{ ...tblTh, width: 100, textAlign: 'right' }}>Total</th>
                <th style={{ ...tblTh, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '52px 16px', color: C.faint, fontSize: 13 }}>
                    Press <KbdTag>F2</KbdTag> to search or scan a medicine
                  </td>
                </tr>
              )}
              {cart.map((item, idx) => {
                const isLast = idx === cart.length - 1
                return (
                  <tr key={item.batchId} style={{ background: isLast ? 'var(--paper)' : idx % 2 === 0 ? '#fff' : 'var(--paper-light)' }}>
                    <td style={{ ...tblTd, color: C.faint, textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ ...tblTd, ...MONO, fontSize: 11.5, color: C.subtext }}>{item.productCode || '—'}</td>
                    <td style={{ ...tblTd }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{item.medicineName}</div>
                      <div style={{ fontSize: 10.5, color: C.faint, ...MONO }}>Batch {item.batchNumber}</div>
                    </td>
                    <td style={{ ...tblTd, padding: '4px 6px' }}>
                      <input
                        ref={el => { rowQtyRefs.current[idx] = el }}
                        type="number"
                        value={item.qty}
                        min={1} max={item.maxQty}
                        onChange={e => setQty(item.batchId, +e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault()
                            rowDiscRefs.current[idx]?.focus()
                            rowDiscRefs.current[idx]?.select()
                          }
                        }}
                        style={{ ...numInput, width: 60 }}
                      />
                    </td>
                    <td style={{ ...tblTd, padding: '4px 6px' }}>
                      <input
                        type="number"
                        value={item.saleRate}
                        min={0}
                        onChange={e => setRate(item.batchId, +e.target.value)}
                        style={{ ...numInput, width: 70 }}
                      />
                    </td>
                    <td style={{ ...tblTd, padding: '4px 6px' }}>
                      <input
                        ref={el => { rowDiscRefs.current[idx] = el }}
                        type="number"
                        value={item.discount}
                        min={0} max={100}
                        onChange={e => setDiscount(item.batchId, +e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault()
                            searchRef.current?.focus()
                            searchRef.current?.select()
                          }
                        }}
                        style={{ ...numInput, width: 50, color: item.discount > 0 ? '#2F8F5F' : C.text }}
                      />
                    </td>
                    <td style={{ ...tblTd, textAlign: 'right', fontWeight: 700, ...MONO, color: C.primary }}>{fmtRs(item.total)}</td>
                    <td style={{ ...tblTd, textAlign: 'center' }}>
                      <button onClick={() => removeFromCart(item.batchId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 3, borderRadius: 4, display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.danger}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.faint}>
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Payment Panel ── */}
        <div style={{
          width: 280, flexShrink: 0, background: '#fff', borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
        {/* Totals + Payment */}
        <div style={{ padding: '12px 16px 16px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, color: C.subtext }}>
            <span>Subtotal</span><span style={MONO}>{fmtRs(subtotal)}</span>
          </div>
          {discountAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, color: C.subtext }}>
              <span>Discount</span><span style={{ ...MONO, color: C.danger }}>-{fmtRs(discountAmt)}</span>
            </div>
          )}
          {taxAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, color: C.subtext }}>
              <span>Tax</span><span style={MONO}>{fmtRs(taxAmt)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800,
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.primary,
          }}>
            <span>Total</span><span style={MONO}>{fmtRs(total)}</span>
          </div>

          {/* Payment Method — CASH / CREDIT */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button
              ref={cashBtnRef}
              onClick={() => { setPaymentMethodAction('CASH'); setTimeout(() => { amountPaidRef.current?.focus(); amountPaidRef.current?.select() }, 30) }}
              onKeyDown={e => {
                if (e.key === 'Tab') { e.preventDefault(); creditBtnRef.current?.focus() }
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setPaymentMethodAction('CASH')
                  setTimeout(() => { amountPaidRef.current?.focus(); amountPaidRef.current?.select() }, 30)
                }
              }}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                background: paymentMethod === 'CASH' ? C.primary : '#fff',
                color: paymentMethod === 'CASH' ? '#fff' : C.subtext,
                border: paymentMethod === 'CASH' ? 'none' : `1px solid ${C.border}`,
                outline: 'none',
              }}
            >
              CASH
            </button>
            <button
              ref={creditBtnRef}
              onClick={() => { setPaymentMethodAction('CREDIT'); setTimeout(() => { checkoutBtnRef.current?.focus() }, 30) }}
              onKeyDown={e => {
                if (e.key === 'Tab') { e.preventDefault(); cashBtnRef.current?.focus() }
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setPaymentMethodAction('CREDIT')
                  setTimeout(() => { checkoutBtnRef.current?.focus() }, 30)
                }
              }}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                background: paymentMethod === 'CREDIT' ? C.primary : '#fff',
                color: paymentMethod === 'CREDIT' ? '#fff' : C.subtext,
                border: paymentMethod === 'CREDIT' ? 'none' : `1px solid ${C.border}`,
                outline: 'none',
              }}
            >
              CREDIT
            </button>
          </div>

          {/* Amount Paid — F6 */}
          {paymentMethod !== 'CREDIT' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <input
                ref={amountPaidRef}
                type="number"
                placeholder="Cash received (F6)"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); completeSaleRef.current?.() }
                  else if (e.key === 'Tab') { e.preventDefault(); checkoutBtnRef.current?.focus() }
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
              {amountPaid !== '' && (
                <div style={{ fontSize: 12, fontWeight: 700, minWidth: 80, textAlign: 'right', ...MONO, color: change < 0 ? C.danger : C.primary }}>
                  Chg {fmtRs(change)}
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)…"
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginTop: 8 }}
          />

          {/* Hold F4 · Quotation · Clear F5 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={holdSale} disabled={cart.length === 0} style={{
              flex: 1, padding: '7px 4px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: '#fff', color: C.text, fontWeight: 600, fontSize: 11, cursor: 'pointer',
              opacity: cart.length === 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
            }}>
              <span>Hold</span><span style={{ fontSize: 9, color: C.faint }}>F4</span>
            </button>
            <button onClick={saveQuotation} disabled={cart.length === 0} style={{
              flex: 1, padding: '7px 4px', borderRadius: 8, border: `1px solid #E8D8FF`,
              background: cart.length === 0 ? '#fff' : '#F5EEFF', color: '#7C3AED', fontWeight: 600, fontSize: 11, cursor: 'pointer',
              opacity: cart.length === 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
            }}>
              <span>Quote</span><span style={{ fontSize: 9, opacity: 0.6 }}>Save</span>
            </button>
            <button onClick={clearCart} disabled={cart.length === 0} style={{
              flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none',
              background: C.dangerBg, color: C.danger, fontWeight: 600, fontSize: 11, cursor: 'pointer',
              opacity: cart.length === 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
            }}>
              <span>Clear</span><span style={{ fontSize: 9, color: C.danger, opacity: 0.6 }}>F5</span>
            </button>
          </div>

          {/* Checkout — F8 */}
          <button
            ref={checkoutBtnRef}
            onClick={completeSale}
            disabled={saleMutation.isPending || cart.length === 0}
            style={{
              width: '100%', marginTop: 8, padding: '12px', borderRadius: 10, border: 'none',
              background: cart.length === 0 ? '#BFDCD3' : C.primary, color: '#fff', fontWeight: 700,
              fontSize: 14, cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saleMutation.isPending
              ? <><Spinner size="sm" /> Processing…</>
              : <><Receipt size={16} /> Checkout — {fmtRs(total)} <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>F8</span></>
            }
          </button>

          {/* Held Sales */}
          {heldSales && heldSales.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.warn, textTransform: 'uppercase', marginBottom: 6 }}>
                On Hold ({heldSales.length})
              </div>
              {heldSales.map((h: any) => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: C.warnBg, borderRadius: 7, padding: '6px 10px', marginBottom: 5, fontSize: 12,
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: C.text }}>{h.items?.length ?? 0} items</span>
                    {h.customer && <span style={{ color: C.faint, marginLeft: 6, fontSize: 11 }}>{h.customer.name}</span>}
                    <div style={{ fontSize: 10, color: C.faint }}>
                      {new Date(h.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => restoreHeld(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontWeight: 700, fontSize: 11 }}>
                      Load
                    </button>
                    <button onClick={() => deleteHeldMutation.mutate(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quotations */}
          {quotations && quotations.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 6 }}>
                Quotations ({quotations.length})
              </div>
              {quotations.map((q: any) => (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#F5EEFF', borderRadius: 7, padding: '6px 10px', marginBottom: 5, fontSize: 12,
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: C.text }}>{q.items?.length ?? 0} items</span>
                    {q.customer && <span style={{ color: C.faint, marginLeft: 6, fontSize: 11 }}>{q.customer.name}</span>}
                    <div style={{ fontSize: 10.5, ...MONO, color: '#7C3AED' }}>{fmtRs(q.total)}</div>
                    <div style={{ fontSize: 10, color: C.faint }}>
                      {new Date(q.createdAt).toLocaleDateString('en-PK')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => restoreQuotation(q)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', fontWeight: 700, fontSize: 11 }}>
                      Load
                    </button>
                    <button onClick={() => deleteQuotationMutation.mutate(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>{/* end payment inner */}
        </div>{/* end payment panel */}
      </div>{/* end middle section */}

      {/* ── Shortcut Bar (bottom) ── */}
      <ShortcutBar onHelp={() => setShowHelp(true)} />

      {/* ── Help Panel ── */}
      {showHelp && <ShortcutsPanel onClose={() => setShowHelp(false)} />}

      {/* ── Receipt Modal ── */}
      {receipt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,36,30,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16,
        }} onClick={newSale}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 340, maxHeight: '88vh',
            overflowY: 'auto', padding: 22,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ ...MONO }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
                <CheckCircle2 size={20} color={C.primary} />
                <span style={{ fontWeight: 800, fontSize: 15, fontFamily: 'inherit' }}>Sale Complete</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, marginTop: 8 }}>AbyteMedix Pharmacy</div>
              <div style={{ textAlign: 'center', fontSize: 10.5, color: C.faint, marginBottom: 12 }}>
                Invoice {receipt.invoiceNumber} · {receipt.date.toLocaleString('en-PK')}
              </div>
              <div style={{ fontSize: 11.5, color: C.subtext, marginBottom: 8 }}>Customer: {receipt.customerName}</div>
              <div style={{ borderTop: '1px dashed #CCC', paddingTop: 8 }}>
                {receipt.lines.map((l: CartItem) => (
                  <div key={l.batchId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                    <span>{l.medicineName} x{l.qty}</span><span>{fmtRs(l.total)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px dashed #CCC', marginTop: 8, paddingTop: 8, fontSize: 11.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{fmtRs(receipt.subtotal)}</span></div>
                {receipt.discountAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-{fmtRs(receipt.discountAmt)}</span></div>}
                {receipt.taxAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>{fmtRs(receipt.taxAmt)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, marginTop: 4, color: C.primary }}>
                  <span>Total</span><span>{fmtRs(receipt.total)}</span>
                </div>
                {receipt.paymentMethod === 'CASH' && <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: C.subtext }}><span>Cash</span><span>{fmtRs(receipt.paid)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: C.subtext }}><span>Change</span><span>{fmtRs(receipt.change)}</span></div>
                </>}
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: C.faint, marginTop: 14 }}>Thank you — get well soon!</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => {
                  setPrintData(receipt)
                  setTimeout(() => window.print(), 120)
                }} style={{
                  flex: 1, padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`,
                  background: '#fff', color: C.text, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Printer size={14} /> Print A4 <span style={{ fontSize: 9, opacity: 0.6 }}>F7</span>
                </button>
                <button onClick={newSale} style={{
                  flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
                  background: C.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <RotateCcw size={14} /> New Sale
                  <span style={{ fontSize: 9, opacity: 0.65, marginLeft: 2 }}>Enter / Esc</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 invoice rendered into #print-root portal */}
      {printData && (
        <PrintA4
          type="sale"
          data={printData}
          onAfterPrint={() => setPrintData(null)}
        />
      )}
    </div>
  )
}
