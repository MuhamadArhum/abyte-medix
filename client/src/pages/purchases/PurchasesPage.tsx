import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye } from 'lucide-react'
import { api } from '../../api/client'
import Table from '../../components/ui/Table'
import type { Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import AddPurchaseForm from './AddPurchaseForm'
import PurchaseDetailModal from './PurchaseDetailModal'

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
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const addOpenRef = useRef(addOpen)
  const viewPurchaseRef = useRef(viewPurchase)
  addOpenRef.current = addOpen
  viewPurchaseRef.current = viewPurchase

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if ((e.key === 'F3' || e.key === 'Insert') && !inInput) {
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

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, limit],
    queryFn: () => api.get(`/purchases?page=${page}&limit=${limit}`).then(r => r.data),
  })

  const purchases: Purchase[] = data?.data ?? []
  const total: number = data?.total ?? 0

  const statusVariant = (s: string) => s === 'PAID' ? 'ok' : s === 'PARTIAL' ? 'warn' : 'neutral'

  const columns: Column<Purchase>[] = [
    { key: 'invoiceNumber', label: 'Invoice #', render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>{r.invoiceNumber}</span> },
    { key: 'supplier', label: 'Supplier', render: r => <span style={{ fontWeight: 600 }}>{r.supplier?.name ?? '—'}</span> },
    { key: 'purchaseDate', label: 'Date', render: r => <span style={{ color: 'var(--steel)' }}>{new Date(r.purchaseDate).toLocaleDateString()}</span> },
    { key: 'total', label: 'Total', render: r => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Rs. {Number(r.total).toLocaleString()}</span> },
    { key: 'amountPaid', label: 'Paid', render: r => <span style={{ fontFamily: 'var(--font-mono)', color: '#2F8F5F' }}>Rs. {Number(r.amountPaid).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: r => <Badge label={r.status} variant={statusVariant(r.status) as any} /> },
    { key: 'actions', label: '', render: r => (
      <button onClick={() => setViewPurchase(r)} style={iconBtn} title="View"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--orange)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--steel)' }}>
        <Eye size={14} />
      </button>
    )},
  ]

  const filtered = search
    ? purchases.filter(p => p.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || p.supplier?.name?.toLowerCase().includes(search.toLowerCase()))
    : purchases

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>Purchases</h1>
          <div style={{ fontSize: 12.5, color: 'var(--steel)', marginTop: 2 }}>Stock purchase records and payment tracking</div>
        </div>
        <button onClick={() => setAddOpen(true)} style={{
          background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius)',
          padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)',
        }}>
          <Plus size={15} /> New Purchase
          <span style={{ opacity: 0.7, fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 4px' }}>F3</span>
        </button>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)' }}>
          <SearchInput inputRef={searchRef} value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by invoice or supplier… (F2)" />
        </div>
        <Table columns={columns} data={filtered} loading={isLoading} />
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
