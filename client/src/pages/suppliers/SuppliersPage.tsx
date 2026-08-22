import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react'
import { api } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import SupplierForm from './SupplierForm'
import SupplierLedger from './SupplierLedger'

interface Supplier {
  id: number
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  payableBalance: string
  isActive: boolean
}

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null)
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, limit, search],
    queryFn: () => api.get(`/suppliers?page=${page}&limit=${limit}&search=${search}`).then(r => r.data),
  })

  const suppliers: Supplier[] = data?.data ?? data ?? []
  const total: number = data?.total ?? suppliers.length

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Supplier deleted')
      setDeleteSupplier(null)
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Name' },
    { key: 'contactPerson', label: 'Contact Person', render: r => r.contactPerson ?? '—' },
    { key: 'phone', label: 'Phone', render: r => r.phone ?? '—' },
    {
      key: 'payableBalance', label: 'Payable Balance', render: r => (
        <span className={Number(r.payableBalance) > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
          Rs. {Number(r.payableBalance).toLocaleString()}
        </span>
      )
    },
    {
      key: 'isActive', label: 'Status', render: r => (
        <Badge label={r.isActive ? 'Active' : 'Inactive'} variant={r.isActive ? 'green' : 'gray'} />
      )
    },
    {
      key: 'actions', label: 'Actions', render: r => (
        <div className="flex items-center gap-1">
          <button onClick={() => setLedgerSupplier(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ledger">
            <BookOpen size={14} />
          </button>
          <button onClick={() => setEditSupplier(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Edit">
            <Edit size={14} />
          </button>
          <button onClick={() => setDeleteSupplier(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Suppliers</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="w-72">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search suppliers..." />
          </div>
        </div>
        <Table columns={columns} data={suppliers} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Supplier">
        <SupplierForm
          onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['suppliers'] }) }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal isOpen={!!editSupplier} onClose={() => setEditSupplier(null)} title="Edit Supplier">
        {editSupplier && (
          <SupplierForm
            initialData={editSupplier}
            onSuccess={() => { setEditSupplier(null); qc.invalidateQueries({ queryKey: ['suppliers'] }) }}
            onCancel={() => setEditSupplier(null)}
          />
        )}
      </Modal>

      {ledgerSupplier && (
        <SupplierLedger supplier={ledgerSupplier} onClose={() => setLedgerSupplier(null)} />
      )}

      <ConfirmDialog
        isOpen={!!deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={() => deleteSupplier && deleteMutation.mutate(deleteSupplier.id)}
        title="Delete Supplier"
        message={`Delete "${deleteSupplier?.name}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
