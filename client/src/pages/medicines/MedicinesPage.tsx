import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Eye, Edit, PowerOff } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import MedicineForm from './MedicineForm'
import BatchListModal from './BatchListModal'
import { useAuthStore } from '../../store/auth.store'
import { ACTION_ROLES, canRole } from '../../config/rbac'

interface Medicine {
  id: number
  productCode: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  packSize: number
  unit: string
  taxRate: string
  reorderLevel: number
  prescriptionRequired: boolean
  isActive: boolean
  totalQty: number
  category?: { id: number; name: string }
  manufacturer?: { id: number; name: string }
  categoryId?: number
  manufacturerId?: number
}

export default function MedicinesPage() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const canAdd = canRole(user?.role, ACTION_ROLES.medicines.add)
  const canEdit = canRole(user?.role, ACTION_ROLES.medicines.edit)
  const canDeactivate = canRole(user?.role, ACTION_ROLES.medicines.deactivate)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editMed, setEditMed] = useState<Medicine | null>(null)
  const [batchMed, setBatchMed] = useState<Medicine | null>(null)
  const [deactivateMed, setDeactivateMed] = useState<Medicine | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', page, limit, search],
    queryFn: () => api.get(`/medicines?page=${page}&limit=${limit}&search=${search}`).then(r => r.data),
  })

  const medicines: Medicine[] = data?.data ?? data ?? []
  const total: number = data?.total ?? medicines.length

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/medicines/${id}`, { isActive: false }).then(r => r.data),
    onSuccess: () => {
      toast.success('Medicine deactivated')
      setDeactivateMed(null)
      qc.invalidateQueries({ queryKey: ['medicines'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const columns: Column<Medicine>[] = [
    { key: 'productCode', label: 'Code', render: r => <span className="mono" style={{ fontSize: 12 }}>{r.productCode}</span> },
    { key: 'brandName', label: 'Brand Name' },
    { key: 'genericName', label: 'Generic', render: r => <span style={{ color: 'var(--steel)', fontSize: 12 }}>{r.genericName}</span> },
    { key: 'category', label: 'Category', render: r => r.category?.name ?? '—' },
    {
      key: 'totalQty', label: 'Stock', render: r => (
        <span className="mono" style={{ color: Number(r.totalQty) <= r.reorderLevel ? 'var(--red-risk)' : 'var(--ink)', fontWeight: Number(r.totalQty) <= r.reorderLevel ? 700 : 400 }}>
          {Number(r.totalQty)}
        </span>
      )
    },
    { key: 'reorderLevel', label: 'Reorder', render: r => <span className="mono">{r.reorderLevel}</span> },
    {
      key: 'isActive', label: 'Status', render: r => (
        <Badge label={r.isActive ? 'Active' : 'Inactive'} variant={r.isActive ? 'green' : 'gray'} />
      )
    },
    {
      key: 'actions', label: 'Actions', render: r => (
        <div className="flex items-center gap-1">
          <button onClick={() => setBatchMed(r)} className="icon-btn" title="View Batches">
            <Eye size={14} />
          </button>
          {canEdit && (
            <button onClick={() => setEditMed(r)} className="icon-btn success" title="Edit">
              <Edit size={14} />
            </button>
          )}
          {canDeactivate && r.isActive && (
            <button onClick={() => setDeactivateMed(r)} className="icon-btn danger" title="Deactivate">
              <PowerOff size={14} />
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
          <div className="pg-title">Medicines</div>
          <div className="pg-sub">{total} total medicines</div>
        </div>
        {canAdd && (
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Medicine
          </button>
        )}
      </div>

      <div className="card">
        <div className="filter-bar">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name, code or barcode..." />
        </div>
        <Table columns={columns} data={medicines} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Medicine" size="lg">
        <MedicineForm
          onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['medicines'] }) }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal isOpen={!!editMed} onClose={() => setEditMed(null)} title="Edit Medicine" size="lg">
        {editMed && (
          <MedicineForm
            initialData={editMed}
            onSuccess={() => { setEditMed(null); qc.invalidateQueries({ queryKey: ['medicines'] }) }}
            onCancel={() => setEditMed(null)}
          />
        )}
      </Modal>

      {batchMed && (
        <BatchListModal medicine={batchMed} onClose={() => setBatchMed(null)} />
      )}

      <ConfirmDialog
        isOpen={!!deactivateMed}
        onClose={() => setDeactivateMed(null)}
        onConfirm={() => deactivateMed && deactivateMutation.mutate(deactivateMed.id)}
        title="Deactivate Medicine"
        message={`Deactivate "${deactivateMed?.brandName}"? It will be hidden from POS search.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}
