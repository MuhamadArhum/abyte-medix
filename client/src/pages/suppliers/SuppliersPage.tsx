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
import SupplierForm from './SupplierForm'
import SupplierLedger from './SupplierLedger'
import { useAuthStore } from '../../store/auth.store'
import { ACTION_ROLES, canRole } from '../../config/rbac'

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
  const user = useAuthStore(s => s.user)
  const canAdd = canRole(user?.role, ACTION_ROLES.suppliers.add)
  const canEdit = canRole(user?.role, ACTION_ROLES.suppliers.edit)
  const canDelete = canRole(user?.role, ACTION_ROLES.suppliers.delete)
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
    onError: (err) => toast.error(getApiError(err)),
  })

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Name' },
    { key: 'contactPerson', label: 'Contact Person', render: r => r.contactPerson ?? '—' },
    { key: 'phone', label: 'Phone', render: r => r.phone ?? '—' },
    {
      key: 'payableBalance', label: 'Payable Balance', render: r => (
        <span className="mono" style={{ color: Number(r.payableBalance) > 0 ? 'var(--red-risk)' : 'var(--ink)', fontWeight: Number(r.payableBalance) > 0 ? 600 : 400 }}>
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
          <button onClick={() => setLedgerSupplier(r)} className="icon-btn" title="Ledger">
            <BookOpen size={14} />
          </button>
          {canEdit && (
            <button onClick={() => setEditSupplier(r)} className="icon-btn success" title="Edit">
              <Edit size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => setDeleteSupplier(r)} className="icon-btn danger" title="Delete">
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
          <div className="pg-title">Suppliers</div>
          <div className="pg-sub">{total} total suppliers</div>
        </div>
        {canAdd && (
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Supplier
          </button>
        )}
      </div>

      <div className="card">
        <div className="filter-bar">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search suppliers..." />
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
        message={`Delete "${deleteSupplier?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
