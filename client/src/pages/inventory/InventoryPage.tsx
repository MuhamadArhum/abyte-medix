import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Settings, Search, X } from 'lucide-react'
import { api } from '../../api/client'
import Table from '../../components/ui/Table'
import type { Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

interface InventoryItem {
  id: number
  brandName: string
  genericName: string
  strength: string
  totalQty: number
  reorderLevel: number
  batches?: BatchItem[]
}

interface BatchItem {
  id: number
  batchNumber: string
  expiryDate: string
  currentQty: number
  saleRate: string
}

interface Movement {
  id: number
  type: string
  quantity: number
  reason: string
  referenceId: number | null
  createdAt: string
  batch: { batchNumber: string; medicine: { brandName: string } }
}

type AdjType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'EXPIRY_WRITEOFF'

function BatchCard({ b }: { b: BatchItem }) {
  const daysLeft = b.expiryDate
    ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000)
    : null
  const isExpired = daysLeft !== null && daysLeft <= 0
  const isCritical = daysLeft !== null && daysLeft > 0 && daysLeft <= 30
  const isWarn = daysLeft !== null && daysLeft > 30 && daysLeft <= 90
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{
      border: isExpired ? '1.5px solid #C23B2E' : isCritical ? '1.5px solid #C23B2E' : isWarn ? '1.5px solid #C98A1E' : '1px solid var(--rule)',
      background: isExpired ? 'rgba(194,59,46,0.06)' : isCritical ? 'rgba(194,59,46,0.04)' : '#fff',
    }}>
      <div className="font-medium">{b.batchNumber}</div>
      <div style={{ color: isExpired ? '#C23B2E' : isCritical ? '#C23B2E' : isWarn ? '#C98A1E' : '#9ca3af' }}>
        Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
        {daysLeft !== null && (
          <span style={{ fontWeight: 700, marginLeft: 4 }}>
            {isExpired ? '(Expired)' : `(${daysLeft}d)`}
          </span>
        )}
      </div>
      <div className="text-gray-600">Qty: <span className="font-semibold">{b.currentQty}</span></div>
      <div className="text-gray-400">Rate: Rs. {Number(b.saleRate).toFixed(2)}</div>
    </div>
  )
}

export default function InventoryPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [adjOpen, setAdjOpen] = useState(false)
  const [invPage, setInvPage] = useState(1)
  const [invLimit, setInvLimit] = useState(25)
  const [invSearch, setInvSearch] = useState('')
  const [invFilter, setInvFilter] = useState('')
  const [invExpiryDays, setInvExpiryDays] = useState(90)
  const [invCategoryId, setInvCategoryId] = useState('')
  const [invManufacturerId, setInvManufacturerId] = useState('')
  const [invSort, setInvSort] = useState('name_asc')
  const [searchInput, setSearchInput] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const todayStr = new Date().toISOString().split('T')[0]
  const [movPage, setMovPage] = useState(1)
  const [movLimit, setMovLimit] = useState(20)
  const [movType, setMovType] = useState('')
  const [movFrom, setMovFrom] = useState(todayStr)
  const [movTo, setMovTo] = useState(todayStr)

  // Adjustment form
  const [adjBatchId, setAdjBatchId] = useState('')
  const [adjType, setAdjType] = useState<AdjType>('ADJUSTMENT_IN')
  const [adjQty, setAdjQty] = useState(1)
  const [adjReason, setAdjReason] = useState('')

  const adjOpenRef = useRef(adjOpen)
  adjOpenRef.current = adjOpen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F4') { e.preventDefault(); setAdjOpen(o => !o) }
      if (e.key === 'Escape' && adjOpenRef.current) setAdjOpen(false)
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['inventory', invPage, invLimit, invSearch, invFilter, invExpiryDays, invCategoryId, invManufacturerId, invSort],
    queryFn: () => api.get(
      `/inventory?page=${invPage}&limit=${invLimit}&search=${encodeURIComponent(invSearch)}&filter=${invFilter}` +
      `&expiryDays=${invExpiryDays}&categoryId=${invCategoryId}&manufacturerId=${invManufacturerId}&sort=${invSort}`
    ).then(r => r.data),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/medicines/categories').then(r => r.data),
  })

  const { data: manufacturersData } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api.get('/medicines/manufacturers').then(r => r.data),
  })

  const { data: movData, isLoading: movLoading } = useQuery({
    queryKey: ['movements', movPage, movLimit, movType, movFrom, movTo],
    queryFn: () => api.get(`/inventory/movements?page=${movPage}&limit=${movLimit}&type=${movType}&from=${movFrom}&to=${movTo}`).then(r => r.data),
    enabled: activeTab === 'movements',
  })

  const { data: allBatchesData } = useQuery({
    queryKey: ['all-batches-flat'],
    queryFn: () => api.get('/inventory?page=1&limit=1000').then(r => r.data),
  })

  const adjMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/inventory/adjustment', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Adjustment recorded')
      setAdjOpen(false)
      setAdjBatchId(''); setAdjQty(1); setAdjReason('')
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Adjustment failed'),
  })

  const movements: Movement[] = movData?.data ?? movData ?? []
  const movTotal: number = movData?.total ?? movements.length
  const inventoryData: InventoryItem[] = invData?.data ?? []
  const invTotal: number = invData?.total ?? 0

  const movColumns: Column<Movement>[] = [
    { key: 'createdAt', label: 'Date', render: r => <span style={{ fontSize: 12, color: 'var(--steel)' }}>{new Date(r.createdAt).toLocaleString()}</span> },
    { key: 'batch', label: 'Medicine', render: r => <span style={{ fontWeight: 600 }}>{r.batch?.medicine?.brandName} <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 11, color: 'var(--steel)' }}>({r.batch?.batchNumber})</span></span> },
    {
      key: 'type', label: 'Type', render: r => {
        const isOut = ['SALE', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY_WRITEOFF'].includes(r.type)
        return (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: isOut ? 'rgba(194,59,46,0.1)' : 'rgba(62,142,90,0.1)',
            color: isOut ? 'var(--red-risk)' : 'var(--green-ok)',
          }}>
            {r.type.replace(/_/g, ' ')}
          </span>
        )
      }
    },
    {
      key: 'quantity', label: 'Qty', render: r => {
        const isOut = ['SALE', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY_WRITEOFF'].includes(r.type)
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isOut ? 'var(--red-risk)' : 'var(--green-ok)' }}>
            {isOut ? '−' : '+'}{Math.abs(r.quantity)}
          </span>
        )
      }
    },
    { key: 'reason', label: 'Reason', render: r => <span style={{ fontSize: 12, color: 'var(--steel)' }}>{r.reason ?? '—'}</span> },
    { key: 'referenceId', label: 'Ref #', render: r => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' }}>{r.referenceId ?? '—'}</span> },
  ]

  const categories: { id: number; name: string }[] = categoriesData ?? []
  const manufacturers: { id: number; name: string }[] = manufacturersData ?? []

  const hasActiveFilters = invFilter || invCategoryId || invManufacturerId || invSort !== 'name_asc'
  const clearAllFilters = () => {
    setInvFilter(''); setInvCategoryId(''); setInvManufacturerId(''); setInvSort('name_asc')
    setInvExpiryDays(90); setInvPage(1)
  }

  // All batches flattened for adjustment dropdown
  const allBatchesList: InventoryItem[] = allBatchesData?.data ?? []
  const allBatches: { id: number; label: string }[] = allBatchesList.flatMap(med =>
    (med.batches ?? []).map(b => ({ id: b.id, label: `${med.brandName} — Batch ${b.batchNumber}` }))
  )

  return (
    <div>
      <div className="pg-header">
        <div><div className="pg-title">Inventory</div><div className="pg-sub">Stock overview and movement history</div></div>
        <button className="btn btn-primary" onClick={() => setAdjOpen(true)}>
          <Settings size={15} /> Adjustment
          <span style={{ opacity: 0.7, fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 4px', marginLeft: 4 }}>F4</span>
        </button>
      </div>

      <div className="tab-bar" style={{ marginBottom: 14 }}>
        {(['stock', 'movements'] as const).map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'stock' ? 'Stock Overview' : 'Movements'}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Filter bar — Row 1: Search + Sort + Count */}
          <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--steel)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setInvSearch(searchInput); setInvPage(1) }
                  if (e.key === 'Escape') { setSearchInput(''); setInvSearch(''); setInvPage(1) }
                }}
                placeholder="Search medicine, generic, code… (Enter)"
                className="field-input"
                style={{ paddingLeft: 32, paddingRight: searchInput ? 32 : 12 }}
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setInvSearch(''); setInvPage(1) }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--steel)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category */}
            <select
              value={invCategoryId}
              onChange={e => { setInvCategoryId(e.target.value); setInvPage(1) }}
              className="filter-select"
              style={{ minWidth: 130 }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Manufacturer */}
            <select
              value={invManufacturerId}
              onChange={e => { setInvManufacturerId(e.target.value); setInvPage(1) }}
              className="filter-select"
              style={{ minWidth: 140 }}
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            {/* Sort */}
            <select
              value={invSort}
              onChange={e => { setInvSort(e.target.value); setInvPage(1) }}
              className="filter-select"
            >
              <option value="name_asc">Name A→Z</option>
              <option value="name_desc">Name Z→A</option>
              <option value="qty_asc">Stock: Low first</option>
              <option value="qty_desc">Stock: High first</option>
            </select>

            {hasActiveFilters && (
              <button onClick={clearAllFilters}
                style={{ fontSize: 12, color: 'var(--steel)', background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '5px 10px', cursor: 'pointer' }}>
                <X size={11} style={{ marginRight: 3 }} />Clear
              </button>
            )}

            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap' }}>
              {invTotal} medicines
            </span>
          </div>

          {/* Filter chips — Row 2: Stock Status + Expiry */}
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', flexWrap: 'wrap' }}>
            {[
              { key: '',        label: 'All',          color: 'var(--orange)' },
              { key: 'low',     label: 'Low Stock',    color: '#C98A1E' },
              { key: 'out',     label: 'Out of Stock', color: '#C23B2E' },
            ].map(f => (
              <button key={f.key}
                onClick={() => { setInvFilter(f.key); setInvPage(1) }}
                style={{
                  padding: '4px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600,
                  border: invFilter === f.key && !['expiring'].includes(invFilter) ? 'none' : '1px solid var(--rule)',
                  background: invFilter === f.key ? f.color : 'var(--paper-light)',
                  color: invFilter === f.key ? '#fff' : 'var(--steel)',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}

            <div style={{ width: 1, background: 'var(--rule)', margin: '0 4px' }} />

            {/* Expiry severity chips */}
            {[
              { days: 30, label: 'Exp ≤30d', color: '#C23B2E' },
              { days: 60, label: 'Exp ≤60d', color: '#C98A1E' },
              { days: 90, label: 'Exp ≤90d', color: '#7c5c1e' },
            ].map(e => {
              const active = invFilter === 'expiring' && invExpiryDays === e.days
              return (
                <button key={e.days}
                  onClick={() => { setInvFilter('expiring'); setInvExpiryDays(e.days); setInvPage(1) }}
                  style={{
                    padding: '4px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600,
                    border: active ? 'none' : '1px solid var(--rule)',
                    background: active ? e.color : 'var(--paper-light)',
                    color: active ? '#fff' : 'var(--steel)',
                    cursor: 'pointer',
                  }}
                >
                  {e.label}
                </button>
              )
            })}
          </div>

          {invLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold w-8" />
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">Medicine</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">Generic</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase font-semibold">Total Stock</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase font-semibold">Reorder Level</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No medicines found</td></tr>
                )}
                {inventoryData.map(med => (
                  <>
                    <tr
                      key={med.id}
                      className="cursor-pointer" style={{ borderBottom: '1px solid var(--rule)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {expandedId === med.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{med.brandName} {med.strength}</td>
                      <td className="px-4 py-3 text-gray-500">{med.genericName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={Number(med.totalQty) <= med.reorderLevel ? 'text-red-600 font-bold' : 'text-gray-900 font-semibold'}>
                          {Number(med.totalQty)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{med.reorderLevel}</td>
                      <td className="px-4 py-3">
                        {Number(med.totalQty) === 0 ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Out of Stock</span>
                        ) : Number(med.totalQty) <= med.reorderLevel ? (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Low Stock</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">In Stock</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === med.id && (
                      <tr key={`${med.id}-batches`}>
                        <td colSpan={6} className="px-8 py-2" style={{ background: 'var(--paper)' }}>
                          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--steel)' }}>Batch Breakdown</div>
                          <div className="flex gap-4 flex-wrap">
                            {(med.batches ?? []).length === 0 ? (
                              <span className="text-xs" style={{ color: 'var(--steel)' }}>No batches</span>
                            ) : (
                              (med.batches ?? []).map(b => <BatchCard key={b.id} b={b} />)
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}

          <Pagination
            page={invPage} total={invTotal} limit={invLimit}
            onChange={p => { setInvPage(p); setExpandedId(null) }}
            onLimitChange={l => { setInvLimit(l); setInvPage(1); setExpandedId(null) }}
          />
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select
              value={movType}
              onChange={e => { setMovType(e.target.value); setMovPage(1) }}
              className="filter-select"
            >
              <option value="">All Types</option>
              {['PURCHASE', 'SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY_WRITEOFF', 'RETURN_IN', 'RETURN_OUT'].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: 'var(--steel)' }}>From:</span>
            <input type="date" value={movFrom} onChange={e => { setMovFrom(e.target.value); setMovPage(1) }} className="filter-select" />
            <span style={{ fontSize: 12, color: 'var(--steel)' }}>To:</span>
            <input type="date" value={movTo} onChange={e => { setMovTo(e.target.value); setMovPage(1) }} className="filter-select" />
            {(movType || movFrom !== todayStr || movTo !== todayStr) && (
              <button
                onClick={() => { setMovType(''); setMovFrom(todayStr); setMovTo(todayStr); setMovPage(1) }}
                style={{ fontSize: 12, color: 'var(--steel)', background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <X size={11} /> Clear
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap' }}>{movTotal} records</span>
          </div>
          <Table columns={movColumns} data={movements} loading={movLoading} />
          <Pagination
            page={movPage} total={movTotal} limit={movLimit}
            onChange={setMovPage}
            onLimitChange={l => { setMovLimit(l); setMovPage(1) }}
          />
        </div>
      )}

      {/* Adjustment Modal */}
      <Modal
        isOpen={adjOpen}
        onClose={() => setAdjOpen(false)}
        title="Stock Adjustment"
        size="sm"
        footer={
          <>
            <button onClick={() => setAdjOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!adjBatchId) { toast.error('Select a batch'); return }
                adjMutation.mutate({ batchId: Number(adjBatchId), type: adjType, quantity: adjQty, reason: adjReason })
              }}
              disabled={adjMutation.isPending}
              className="btn btn-primary disabled:opacity-50"
            >
              {adjMutation.isPending && <Spinner size="sm" />}
              Apply
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
            <select
              className="field-input"
              value={adjBatchId}
              onChange={e => setAdjBatchId(e.target.value)}
            >
              <option value="">Select batch...</option>
              {allBatches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              className="field-input"
              value={adjType}
              onChange={e => setAdjType(e.target.value as AdjType)}
            >
              <option value="ADJUSTMENT_IN">Adjustment In</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out</option>
              <option value="DAMAGE">Damage</option>
              <option value="EXPIRY_WRITEOFF">Expiry Write-off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={adjQty}
              onChange={e => setAdjQty(Number(e.target.value))}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              className="field-input"
              rows={2}
              placeholder="Reason for adjustment..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
