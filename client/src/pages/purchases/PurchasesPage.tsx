import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, X } from 'lucide-react'
import { api } from '../../api/client'
import Table from '../../components/ui/Table'
import type { Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import AddPurchaseForm from './AddPurchaseForm'
import PurchaseDetailModal from './PurchaseDetailModal'
import { useAuthStore } from '../../store/auth.store'
import { ACTION_ROLES, canRole } from '../../config/rbac'

function KbdTag({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'var(--font-mono)',
      color: '#fff', fontWeight: 600, lineHeight: 1.6,
    }}>{children}</kbd>
  )
}

interface Purchase {
  id: number; invoiceNumber: string; supplier: { name: string }
  purchaseDate: string; total: string; amountPaid: string; status: string
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 5,
  borderRadius: 'var(--radius)', color: 'var(--steel)', display: 'flex', alignItems: 'center',
}

export default function PurchasesPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const canAdd = canRole(user?.role, ACTION_ROLES.purchases.add)
  const today = new Date().toISOString().split('T')[0]
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [status, setStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const addOpenRef = useRef(addOpen)
  const viewPurchaseRef = useRef(viewPurchase)
  const canAddRef = useRef(canAdd)
  addOpenRef.current = addOpen
  viewPurchaseRef.current = viewPurchase
  canAddRef.current = canAdd

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if ((e.key === 'F3' || e.key === 'Insert') && !inInput && canAddRef.current) {
        e.preventDefault()
        if (!addOpenRef.current && !viewPurchaseRef.current) setAddOpen(true)
      } else if (e.key === 'Escape') {
        if (addOpenRef.current) setAddOpen(false)
        else if (viewPurchaseRef.current) setViewPurchase(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers?page=1&limit=200').then(r => r.data),
  })
  const suppliersList: { id: number; name: string }[] = suppliersData?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, limit, search, from, to, status, supplierId],
    queryFn: () => api.get(
      `/purchases?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}` +
      `&from=${from}&to=${to}&status=${status}&supplierId=${supplierId}`
    ).then(r => r.data),
  })

  const purchases: Purchase[] = data?.data ?? []
  const total: number = data?.total ?? 0

  const pageTotal = purchases.reduce((s, r) => s + Number(r.total), 0)
  const pagePaid = purchases.reduce((s, r) => s + Number(r.amountPaid), 0)
  const pageDue = pageTotal - pagePaid

  const hasFilters = search || status || supplierId || from !== today || to !== today
  const clearFilters = () => { setSearch(''); setStatus(''); setSupplierId(''); setFrom(today); setTo(today); setPage(1) }

  const statusVariant = (s: string): 'green' | 'warn' | 'neutral' =>
    s === 'RECEIVED' ? 'green' : s === 'PARTIAL' ? 'warn' : 'neutral'

  const columns: Column<Purchase>[] = [
    { key: 'invoiceNumber', label: 'Invoice #', render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>{r.invoiceNumber}</span> },
    { key: 'supplier', label: 'Supplier', render: r => <span style={{ fontWeight: 600 }}>{r.supplier?.name ?? '—'}</span> },
    { key: 'purchaseDate', label: 'Date', render: r => <span style={{ color: 'var(--steel)' }}>{new Date(r.purchaseDate).toLocaleDateString()}</span> },
    { key: 'total', label: 'Total', render: r => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Rs. {Number(r.total).toLocaleString()}</span> },
    { key: 'amountPaid', label: 'Paid', render: r => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-ok)' }}>Rs. {Number(r.amountPaid).toLocaleString()}</span> },
    {
      key: 'status', label: 'Balance Due', render: r => {
        const due = Number(r.total) - Number(r.amountPaid)
        return due > 0
          ? <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red-risk)', fontWeight: 700 }}>Rs. {due.toLocaleString()}</span>
          : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-ok)' }}>—</span>
      }
    },
    { key: 'status', label: 'Status', render: r => <Badge label={r.status} variant={statusVariant(r.status)} /> },
    { key: 'actions', label: '', render: r => (
      <button onClick={() => setViewPurchase(r)} style={iconBtn} title="View"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--orange)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--steel)' }}>
        <Eye size={14} />
      </button>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>Purchases</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>{total} records</span>
            {pageTotal > 0 && (
              <>
                <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>·</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600 }}>Total: <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {pageTotal.toLocaleString()}</span></span>
                <span style={{ fontSize: 12.5, color: 'var(--green-ok)', fontWeight: 600 }}>Paid: <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {pagePaid.toLocaleString()}</span></span>
                {pageDue > 0 && <span style={{ fontSize: 12.5, color: 'var(--red-risk)', fontWeight: 600 }}>Due: <span style={{ fontFamily: 'var(--font-mono)' }}>Rs. {pageDue.toLocaleString()}</span></span>}
              </>
            )}
          </div>
        </div>
        {canAdd && (
          <button onClick={() => setAddOpen(true)} style={{
            background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
            padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)',
          }}>
            <Plus size={15} /> New Purchase
            <span style={{ opacity: 0.7, fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 4px' }}>F3</span>
          </button>
        )}
      </div>

      <div style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {/* Filter bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput inputRef={searchRef} value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search invoice or supplier… (F2)" />

          <span style={{ fontSize: 12, color: 'var(--steel)' }}>From:</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="filter-select" />
          <span style={{ fontSize: 12, color: 'var(--steel)' }}>To:</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="filter-select" />

          <select value={supplierId} onChange={e => { setSupplierId(e.target.value); setPage(1) }} className="filter-select" style={{ minWidth: 130 }}>
            <option value="">All Suppliers</option>
            {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Status chips */}
          {[
            { v: '',         label: 'All' },
            { v: 'RECEIVED', label: 'Received' },
            { v: 'PARTIAL',  label: 'Partial' },
            { v: 'DRAFT',    label: 'Draft' },
          ].map(s => (
            <button key={s.v}
              onClick={() => { setStatus(s.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: status === s.v ? 'none' : '1px solid var(--rule)',
                background: status === s.v ? 'var(--orange)' : 'var(--paper-light)',
                color: status === s.v ? '#fff' : 'var(--steel)',
              }}
            >{s.label}</button>
          ))}

          {hasFilters && (
            <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--steel)', background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={11} /> Clear Filters
            </button>
          )}
        </div>
        <Table columns={columns} data={purchases} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Purchase" size="xl">
        <AddPurchaseForm onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['purchases'] }) }} onCancel={() => setAddOpen(false)} />
      </Modal>
      {viewPurchase && <PurchaseDetailModal purchaseId={viewPurchase.id} onClose={() => setViewPurchase(null)} />}

      {/* Shortcut bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 200, right: 0, height: 32,
        background: 'var(--ink)', display: 'flex', alignItems: 'center',
        gap: 20, paddingLeft: 20, zIndex: 40,
      }}>
        {[
          { key: 'F2', label: 'Search' },
          { key: 'F3', label: 'New Purchase' },
          { key: 'F7', label: 'Print Invoice' },
          { key: 'Esc', label: 'Close' },
        ].map(s => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            <KbdTag>{s.key}</KbdTag> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
