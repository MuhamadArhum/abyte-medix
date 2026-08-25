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
  const [statusFilter, setStatusFilter] = useState('active')
  const [balanceFilter, setBalanceFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null)
  const [deactivateCustomer, setDeactivateCustomer] = useState<Customer | null>(null)
  const [reactivateCustomer, setReactivateCustomer] = useState<Customer | null>(null)

  // Server-side filters
  const isActiveParam = statusFilter === 'active' ? 'true' : statusFilter === 'inactive' ? 'false' : ''
  const hasBalanceParam = balanceFilter === 'has' ? 'true' : balanceFilter === 'clear' ? 'false' : ''

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, limit, search, isActiveParam, hasBalanceParam],
    queryFn: () => api.get(
      `/customers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}` +
      `&isActive=${isActiveParam}&hasBalance=${hasBalanceParam}`
    ).then(r => r.data),
  })

  const customers: Customer[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const withBalance = customers.filter(c => Number(c.outstandingBalance) > 0).length

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Customer deactivated')
      setDeactivateCustomer(null)
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/customers/${id}/reactivate`).then(r => r.data),
    onSuccess: () => {
      toast.success('Customer reactivated')
      setReactivateCustomer(null)
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const columns: Column<Customer>[] = [
    { key: 'name', label: 'Name', render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'phone', label: 'Phone', render: r => <span style={{ color: 'var(--steel)', fontSize: 12 }}>{r.phone || '—'}</span> },
    {
      key: 'creditLimit', label: 'Credit Limit', render: r => (
        <span className="mono" style={{ fontSize: 12 }}>Rs. {Number(r.creditLimit).toLocaleString()}</span>
      )
    },
    {
      key: 'outstandingBalance', label: 'Outstanding', render: r => {
        const bal = Number(r.outstandingBalance)
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
          <button onClick={() => setLedgerCustomer(r)} className="icon-btn" title="Ledger">
            <BookOpen size={14} />
          </button>
          {canEdit && (
            <button onClick={() => setEditCustomer(r)} className="icon-btn success" title="Edit">
              <Edit size={14} />
            </button>
          )}
          {canDeactivate && r.isActive && (
            <button onClick={() => setDeactivateCustomer(r)} className="icon-btn danger" title="Deactivate">
              <PowerOff size={14} />
            </button>
          )}
          {canDeactivate && !r.isActive && (
            <button onClick={() => setReactivateCustomer(r)} className="icon-btn" title="Reactivate" style={{ color: '#3E8E5A' }}>
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
          <div className="pg-title">Customers</div>
          <div className="pg-sub">
            {total} total
            {withBalance > 0 && <span style={{ marginLeft: 8, color: 'var(--red-risk)', fontWeight: 600 }}>· {withBalance} with outstanding balance</span>}
          </div>
        </div>
        {canAdd && (
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Customer
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
            { v: '',      label: 'All Balance' },
            { v: 'has',   label: 'Has Balance' },
            { v: 'clear', label: 'Cleared' },
          ].map(b => (
            <button key={b.v}
              onClick={() => { setBalanceFilter(b.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: balanceFilter === b.v ? 'none' : '1px solid var(--rule)',
                background: balanceFilter === b.v ? (b.v === 'has' ? '#C23B2E' : 'var(--orange)') : 'var(--paper-light)',
                color: balanceFilter === b.v ? '#fff' : 'var(--steel)',
              }}
            >{b.label}</button>
          ))}
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
        isOpen={!!deactivateCustomer}
        onClose={() => setDeactivateCustomer(null)}
        onConfirm={() => deactivateCustomer && deactivateMutation.mutate(deactivateCustomer.id)}
        title="Deactivate Customer"
        message={`Deactivate "${deactivateCustomer?.name}"? They will no longer appear in POS.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!reactivateCustomer}
        onClose={() => setReactivateCustomer(null)}
        onConfirm={() => reactivateCustomer && reactivateMutation.mutate(reactivateCustomer.id)}
        title="Reactivate Customer"
        message={`Reactivate "${reactivateCustomer?.name}"? They will appear again in POS.`}
        confirmLabel="Reactivate"
        loading={reactivateMutation.isPending}
      />
    </div>
  )
}
