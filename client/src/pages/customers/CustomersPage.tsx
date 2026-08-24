import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import CustomerForm from './CustomerForm'
import CustomerLedger from './CustomerLedger'
import { useAuthStore } from '../../store/auth.store'
import { ACTION_ROLES, canRole } from '../../config/rbac'

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
  const user = useAuthStore(s => s.user)
  const canAdd = canRole(user?.role, ACTION_ROLES.customers.add)
  const canEdit = canRole(user?.role, ACTION_ROLES.customers.edit)
  const canDeactivate = canRole(user?.role, ACTION_ROLES.customers.deactivate)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, limit, search],
    queryFn: () => api.get(`/customers?page=${page}&limit=${limit}&search=${search}`).then(r => r.data),
  })

  const customers: Customer[] = data?.data ?? data ?? []
  const total: number = data?.total ?? customers.length

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Customer deactivated')
      setDeleteCustomer(null)
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const columns: Column<Customer>[] = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'creditLimit', label: 'Credit Limit', render: r => (
        <span className="mono">Rs. {Number(r.creditLimit).toLocaleString()}</span>
      )
    },
    {
      key: 'outstandingBalance', label: 'Outstanding', render: r => (
        <span className="mono" style={{ color: Number(r.outstandingBalance) > 0 ? 'var(--red-risk)' : 'var(--ink)', fontWeight: Number(r.outstandingBalance) > 0 ? 600 : 400 }}>
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
          <button onClick={() => setLedgerCustomer(r)} className="icon-btn" title="Ledger">
            <BookOpen size={14} />
          </button>
          {canEdit && (
            <button onClick={() => setEditCustomer(r)} className="icon-btn success" title="Edit">
              <Edit size={14} />
            </button>
          )}
          {canDeactivate && (
            <button onClick={() => setDeleteCustomer(r)} className="icon-btn danger" title="Deactivate">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    },
  ]

  return (
    <div className="pg">
      <div className="pg-header">
        <div>
          <div className="pg-title">Customers</div>
          <div className="pg-sub">{total} total customers</div>
        </div>
        {canAdd && (
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Customer
          </button>
        )}
      </div>

      <div className="card">
        <div className="filter-bar">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name or phone..." />
        </div>
        <Table columns={columns} data={customers} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
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
        title="Deactivate Customer"
        message={`Deactivate "${deleteCustomer?.name}"? They will no longer appear in POS.`}
        confirmLabel="Deactivate"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
