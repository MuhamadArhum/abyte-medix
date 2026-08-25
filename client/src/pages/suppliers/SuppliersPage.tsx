import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, PowerOff, Power, BookOpen } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState('active')
  const [payableFilter, setPayableFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null)
  const [deactivateSupplier, setDeactivateSupplier] = useState<Supplier | null>(null)
  const [reactivateSupplier, setReactivateSupplier] = useState<Supplier | null>(null)

  const isActiveParam = statusFilter === 'active' ? 'true' : statusFilter === 'inactive' ? 'false' : ''
  const hasPayableParam = payableFilter === 'has' ? 'true' : payableFilter === 'clear' ? 'false' : ''

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, limit, search, isActiveParam, hasPayableParam],
    queryFn: () => api.get(
      `/suppliers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}` +
      `&isActive=${isActiveParam}&hasPayable=${hasPayableParam}`
    ).then(r => r.data),
  })

  const suppliers: Supplier[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const withPayable = suppliers.filter(s => Number(s.payableBalance) > 0).length

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Supplier deactivated')
      setDeactivateSupplier(null)
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/suppliers/${id}/reactivate`).then(r => r.data),
    onSuccess: () => {
      toast.success('Supplier reactivated')
      setReactivateSupplier(null)
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'contactPerson', label: 'Contact', render: r => <span style={{ color: 'var(--steel)', fontSize: 12 }}>{r.contactPerson || '—'}</span> },
    { key: 'phone', label: 'Phone', render: r => <span style={{ color: 'var(--steel)', fontSize: 12 }}>{r.phone || '—'}</span> },
    {
      key: 'payableBalance', label: 'Payable', render: r => {
        const bal = Number(r.payableBalance)
        return (
          <span className="mono" style={{ color: bal > 0 ? 'var(--red-risk)' : 'var(--green-ok)', fontWeight: bal > 0 ? 700 : 400, fontSize: 12 }}>
            Rs. {bal.toLocaleString()}
          </span>
        )
      }
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
          {canDelete && r.isActive && (
            <button onClick={() => setDeactivateSupplier(r)} className="icon-btn danger" title="Deactivate">
              <PowerOff size={14} />
            </button>
          )}
          {canDelete && !r.isActive && (
            <button onClick={() => setReactivateSupplier(r)} className="icon-btn" title="Reactivate" style={{ color: '#3E8E5A' }}>
              <Power size={14} />
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
          <div className="pg-sub">
            {total} total
            {withPayable > 0 && <span style={{ marginLeft: 8, color: 'var(--red-risk)', fontWeight: 600 }}>· {withPayable} with payable balance</span>}
          </div>
        </div>
        {canAdd && (
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Supplier
          </button>
        )}
      </div>

      <div className="card">
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name or phone..." />

          {[
            { v: 'active',   label: 'Active' },
            { v: 'inactive', label: 'Inactive' },
            { v: '',         label: 'All' },
          ].map(s => (
            <button key={s.v}
              onClick={() => { setStatusFilter(s.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: statusFilter === s.v ? 'none' : '1px solid var(--rule)',
                background: statusFilter === s.v ? (s.v === 'inactive' ? '#6B7280' : 'var(--orange)') : 'var(--paper-light)',
                color: statusFilter === s.v ? '#fff' : 'var(--steel)',
              }}
            >{s.label}</button>
          ))}

          <div style={{ width: 1, background: 'var(--rule)', height: 20 }} />

          {[
            { v: '',      label: 'All Payable' },
            { v: 'has',   label: 'Has Payable' },
            { v: 'clear', label: 'Settled' },
          ].map(p => (
            <button key={p.v}
              onClick={() => { setPayableFilter(p.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: payableFilter === p.v ? 'none' : '1px solid var(--rule)',
                background: payableFilter === p.v ? (p.v === 'has' ? '#C23B2E' : 'var(--orange)') : 'var(--paper-light)',
                color: payableFilter === p.v ? '#fff' : 'var(--steel)',
              }}
            >{p.label}</button>
          ))}
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
        isOpen={!!deactivateSupplier}
        onClose={() => setDeactivateSupplier(null)}
        onConfirm={() => deactivateSupplier && deactivateMutation.mutate(deactivateSupplier.id)}
        title="Deactivate Supplier"
        message={`Deactivate "${deactivateSupplier?.name}"? They will be hidden from purchase forms.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!reactivateSupplier}
        onClose={() => setReactivateSupplier(null)}
        onConfirm={() => reactivateSupplier && reactivateMutation.mutate(reactivateSupplier.id)}
        title="Reactivate Supplier"
        message={`Reactivate "${reactivateSupplier?.name}"? They will appear again in purchase forms.`}
        confirmLabel="Reactivate"
        loading={reactivateMutation.isPending}
      />
    </div>
  )
}
