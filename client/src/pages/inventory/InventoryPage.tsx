import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { api } from '../../api/client'
import Table, { Column } from '../../components/ui/Table'
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
  const [movPage, setMovPage] = useState(1)
  const [movType, setMovType] = useState('')
  const [movFrom, setMovFrom] = useState('')
  const [movTo, setMovTo] = useState('')

  // Adjustment form
  const [adjBatchId, setAdjBatchId] = useState('')
  const [adjType, setAdjType] = useState<AdjType>('ADJUSTMENT_IN')
  const [adjQty, setAdjQty] = useState(1)
  const [adjReason, setAdjReason] = useState('')

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data),
  })

  const { data: movData, isLoading: movLoading } = useQuery({
    queryKey: ['movements', movPage, movType, movFrom, movTo],
    queryFn: () => api.get(`/inventory/movements?page=${movPage}&limit=20&type=${movType}&from=${movFrom}&to=${movTo}`).then(r => r.data),
    enabled: activeTab === 'movements',
  })

  const { data: batches } = useQuery({
    queryKey: ['all-batches'],
    queryFn: () => api.get('/inventory').then(r => r.data),
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
  const inventoryData: InventoryItem[] = inventory ?? []

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
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 ${movTypeColor(r.type)}`}>
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
  const allBatches: { id: number; label: string }[] = inventoryData.flatMap(med =>
    (med.batches ?? []).map(b => ({ id: b.id, label: `${med.brandName} — Batch ${b.batchNumber}` }))
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
        <button
          onClick={() => setAdjOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Settings size={16} /> Adjustment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(['stock', 'movements'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'stock' ? 'Stock Overview' : 'Movements'}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {invLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
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
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No data</td></tr>
                )}
                {inventoryData.map(med => (
                  <>
                    <tr
                      key={med.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
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
                        <td colSpan={6} className="bg-blue-50 px-8 py-2">
                          <div className="text-xs font-semibold text-gray-500 mb-2">Batch Breakdown</div>
                          <div className="flex gap-4 flex-wrap">
                            {(med.batches ?? []).length === 0 ? (
                              <span className="text-xs text-gray-400">No batches</span>
                            ) : (
                              (med.batches ?? []).map(b => (
                                <div key={b.id} className="bg-white rounded-lg px-3 py-2 text-xs border border-blue-100">
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
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 flex gap-3 flex-wrap">
            <select
              value={movType}
              onChange={e => { setMovType(e.target.value); setMovPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={movTo}
              onChange={e => { setMovTo(e.target.value); setMovPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <Pagination page={movPage} total={movTotal} limit={20} onChange={setMovPage} />
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
            <button onClick={() => setAdjOpen(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!adjBatchId) { toast.error('Select a batch'); return }
                adjMutation.mutate({ batchId: Number(adjBatchId), type: adjType, quantity: adjQty, reason: adjReason })
              }}
              disabled={adjMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Reason for adjustment..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
