import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react'
import { api } from '../../api/client'
import Table, { Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import CustomerForm from './CustomerForm'
import CustomerLedger from './CustomerLedger'

interface Customer {
  id: number
  name: string
  phone: string
  email: string
  address: string
  creditLimit: string
  outstandingBalance: string
  isActive: boolean
}

export default function CustomersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get(`/customers?page=${page}&limit=20&search=${search}`).then(r => r.data),
  })

  const customers: Customer[] = data?.data ?? data ?? []
  const total: number = data?.total ?? customers.length

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Customer deleted')
      setDeleteCustomer(null)
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const columns: Column<Customer>[] = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'creditLimit', label: 'Credit Limit', render: r => `Rs. ${Number(r.creditLimit).toLocaleString()}` },
    {
      key: 'outstandingBalance', label: 'Outstanding', render: r => (
        <span className={Number(r.outstandingBalance) > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>
          Rs. {Number(r.outstandingBalance).toLocaleString()}
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
          <button onClick={() => setLedgerCustomer(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ledger">
            <BookOpen size={14} />
          </button>
          <button onClick={() => setEditCustomer(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Edit">
            <Edit size={14} />
          </button>
          <button onClick={() => setDeleteCustomer(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Customers</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="w-72">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name or phone..." />
          </div>
        </div>
        <Table columns={columns} data={customers} loading={isLoading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Customer">
        <CustomerForm
          onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['customers'] }) }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal isOpen={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer">
        {editCustomer && (
          <CustomerForm
            initialData={editCustomer}
            onSuccess={() => { setEditCustomer(null); qc.invalidateQueries({ queryKey: ['customers'] }) }}
            onCancel={() => setEditCustomer(null)}
          />
        )}
      </Modal>

      {ledgerCustomer && (
        <CustomerLedger customer={ledgerCustomer} onClose={() => setLedgerCustomer(null)} />
      )}

      <ConfirmDialog
        isOpen={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={() => deleteCustomer && deleteMutation.mutate(deleteCustomer.id)}
        title="Delete Customer"
        message={`Delete "${deleteCustomer?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
