import { useState, useRef } from 'react'
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
  createdAt: string
  batch: { batchNumber: string; medicine: { brandName: string } }
  user: { fullName: string }
}

type AdjType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'EXPIRY_WRITEOFF'

export default function InventoryPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [adjOpen, setAdjOpen] = useState(false)
  const [invPage, setInvPage] = useState(1)
  const [invLimit, setInvLimit] = useState(25)
  const [invSearch, setInvSearch] = useState('')
  const [invFilter, setInvFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [movPage, setMovPage] = useState(1)
  const [movLimit, setMovLimit] = useState(20)
  const [movType, setMovType] = useState('')
  const [movFrom, setMovFrom] = useState('')
  const [movTo, setMovTo] = useState('')

  // Adjustment form
  const [adjBatchId, setAdjBatchId] = useState('')
  const [adjType, setAdjType] = useState<AdjType>('ADJUSTMENT_IN')
  const [adjQty, setAdjQty] = useState(1)
  const [adjReason, setAdjReason] = useState('')

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['inventory', invPage, invLimit, invSearch, invFilter],
    queryFn: () => api.get(`/inventory?page=${invPage}&limit=${invLimit}&search=${encodeURIComponent(invSearch)}&filter=${invFilter}`).then(r => r.data),
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

  const movTypeColor = (type: string) => {
    if (['SALE', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY_WRITEOFF'].includes(type)) return 'text-red-600'
    if (['PURCHASE', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(type)) return 'text-green-600'
    return 'text-gray-700'
  }

  const movColumns: Column<Movement>[] = [
    { key: 'createdAt', label: 'Date', render: r => new Date(r.createdAt).toLocaleString() },
    { key: 'batch', label: 'Medicine', render: r => `${r.batch?.medicine?.brandName} (${r.batch?.batchNumber})` },
    {
      key: 'type', label: 'Type', render: r => (
        <span className={`badge badge-neutral ${movTypeColor(r.type)}`}>
          {r.type.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'quantity', label: 'Qty', render: r => (
        <span className={movTypeColor(r.type)}>
          {['SALE', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY_WRITEOFF'].includes(r.type) ? '-' : '+'}{r.quantity}
        </span>
      )
    },
    { key: 'reason', label: 'Reason', render: r => r.reason ?? '—' },
    { key: 'user', label: 'By', render: r => r.user?.fullName ?? '—' },
  ]

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
          {/* Search + filter bar */}
          <div className="filter-bar">
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
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

            {/* Filter chips */}
            {(['', 'low', 'out'] as const).map(f => (
              <button key={f}
                onClick={() => { setInvFilter(f); setInvPage(1) }}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600,
                  border: invFilter === f ? 'none' : '1px solid var(--rule)',
                  background: invFilter === f ? 'var(--orange)' : 'var(--paper-light)',
                  color: invFilter === f ? '#fff' : 'var(--steel)',
                  cursor: 'pointer',
                }}
              >
                {f === '' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}

            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--steel)' }}>
              {invTotal} medicines
            </span>
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
                              (med.batches ?? []).map(b => (
                                <div key={b.id} className="bg-white rounded-lg px-3 py-2 text-xs" style={{ border: '1px solid var(--rule)' }}>
                                  <div className="font-medium">{b.batchNumber}</div>
                                  <div className="text-gray-400">Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</div>
                                  <div className="text-gray-600">Qty: <span className="font-semibold">{b.currentQty}</span></div>
                                  <div className="text-gray-400">Rate: Rs. {Number(b.saleRate).toFixed(2)}</div>
                                </div>
                              ))
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
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 flex gap-3 flex-wrap">
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
            <input
              type="date"
              value={movFrom}
              onChange={e => { setMovFrom(e.target.value); setMovPage(1) }}
              className="filter-select"
            />
            <input
              type="date"
              value={movTo}
              onChange={e => { setMovTo(e.target.value); setMovPage(1) }}
              className="filter-select"
            />
            {(movType || movFrom || movTo) && (
              <button
                onClick={() => { setMovType(''); setMovFrom(''); setMovTo(''); setMovPage(1) }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Clear filters
              </button>
            )}
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
