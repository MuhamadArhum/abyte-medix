import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye } from 'lucide-react'
import { api } from '../../api/client'
import Table, { Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import AddPurchaseForm from './AddPurchaseForm'
import PurchaseDetailModal from './PurchaseDetailModal'

interface Purchase {
  id: number
  invoiceNumber: string
  supplier: { name: string }
  purchaseDate: string
  totalAmount: string
  amountPaid: string
  status: string
}

export default function PurchasesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, search],
    queryFn: () => api.get(`/purchases?page=${page}&limit=20`).then(r => r.data),
  })

  const purchases: Purchase[] = data?.data ?? data ?? []
  const total: number = data?.total ?? purchases.length

  const statusVariant = (s: string) => {
    if (s === 'PAID') return 'green'
    if (s === 'PARTIAL') return 'yellow'
    return 'gray'
  }

  const columns: Column<Purchase>[] = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'supplier', label: 'Supplier', render: r => r.supplier?.name ?? '—' },
    { key: 'purchaseDate', label: 'Date', render: r => new Date(r.purchaseDate).toLocaleDateString() },
    { key: 'totalAmount', label: 'Total', render: r => `Rs. ${Number(r.totalAmount).toLocaleString()}` },
    { key: 'amountPaid', label: 'Paid', render: r => `Rs. ${Number(r.amountPaid).toLocaleString()}` },
    {
      key: 'status', label: 'Status', render: r => (
        <Badge label={r.status} variant={statusVariant(r.status) as any} />
      )
    },
    {
      key: 'actions', label: 'Actions', render: r => (
        <button
          onClick={() => setViewPurchase(r)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          title="View"
        >
          <Eye size={14} />
        </button>
      )
    },
  ]

  const filteredPurchases = search
    ? purchases.filter(p =>
        p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : purchases

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Purchases</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> New Purchase
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="w-72">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by invoice or supplier..." />
          </div>
        </div>
        <Table columns={columns} data={filteredPurchases} loading={isLoading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Purchase" size="xl">
        <AddPurchaseForm
          onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['purchases'] }) }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {viewPurchase && (
        <PurchaseDetailModal
          purchaseId={viewPurchase.id}
          onClose={() => setViewPurchase(null)}
        />
      )}
    </div>
  )
}
