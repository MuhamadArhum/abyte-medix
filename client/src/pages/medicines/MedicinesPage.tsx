import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Eye, Edit, PowerOff, Power, AlertTriangle } from 'lucide-react'
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
  const [categoryId, setCategoryId] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [prescriptionFilter, setPrescriptionFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('true')
  const [addOpen, setAddOpen] = useState(false)
  const [editMed, setEditMed] = useState<Medicine | null>(null)
  const [batchMed, setBatchMed] = useState<Medicine | null>(null)
  const [deactivateMed, setDeactivateMed] = useState<Medicine | null>(null)
  const [reactivateMed, setReactivateMed] = useState<Medicine | null>(null)
  const [stockFilter, setStockFilter] = useState('')

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/medicines/categories').then(r => r.data),
  })
  const { data: manufacturersData } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api.get('/medicines/manufacturers').then(r => r.data),
  })
  const categories: { id: number; name: string }[] = categoriesData ?? []
  const manufacturers: { id: number; name: string }[] = manufacturersData ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', page, limit, search, categoryId, manufacturerId, prescriptionFilter, activeFilter],
    queryFn: () => api.get(
      `/medicines?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}` +
      `&categoryId=${categoryId}&manufacturerId=${manufacturerId}` +
      `&prescriptionRequired=${prescriptionFilter}&isActive=${activeFilter}`
    ).then(r => r.data),
  })

  const allMedicines: Medicine[] = data?.data ?? data ?? []
  const medicines = stockFilter === 'low'
    ? allMedicines.filter(m => Number(m.totalQty) > 0 && Number(m.totalQty) <= m.reorderLevel)
    : stockFilter === 'out'
    ? allMedicines.filter(m => Number(m.totalQty) === 0)
    : allMedicines
  const total: number = data?.total ?? allMedicines.length
  const lowCount = allMedicines.filter(m => Number(m.totalQty) > 0 && Number(m.totalQty) <= m.reorderLevel).length
  const outCount = allMedicines.filter(m => Number(m.totalQty) === 0).length

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/medicines/${id}`, { isActive: false }).then(r => r.data),
    onSuccess: () => {
      toast.success('Medicine deactivated')
      setDeactivateMed(null)
      qc.invalidateQueries({ queryKey: ['medicines'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/medicines/${id}`, { isActive: true }).then(r => r.data),
    onSuccess: () => {
      toast.success('Medicine reactivated')
      setReactivateMed(null)
      qc.invalidateQueries({ queryKey: ['medicines'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const columns: Column<Medicine>[] = [
    { key: 'productCode', label: 'Code', render: r => <span className="mono" style={{ fontSize: 11.5 }}>{r.productCode}</span> },
    { key: 'brandName', label: 'Brand Name', render: r => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.brandName}</div>
        {r.strength && <div style={{ fontSize: 11, color: 'var(--steel)' }}>{r.strength}</div>}
      </div>
    )},
    { key: 'genericName', label: 'Generic', render: r => <span style={{ color: 'var(--steel)', fontSize: 12 }}>{r.genericName || '—'}</span> },
    { key: 'category', label: 'Category', render: r => <span style={{ fontSize: 12 }}>{r.category?.name ?? '—'}</span> },
    {
      key: 'totalQty', label: 'Stock', render: r => {
        const qty = Number(r.totalQty)
        if (qty === 0) return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(194,59,46,0.12)', color: 'var(--red-risk)', borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
            <AlertTriangle size={9} /> Out
          </span>
        )
        if (qty <= r.reorderLevel) return (
          <span className="mono" style={{ color: '#C98A1E', fontWeight: 700, fontSize: 12 }}>
            {qty} <span style={{ fontSize: 10, opacity: 0.8 }}>↓Low</span>
          </span>
        )
        return <span className="mono" style={{ fontSize: 12 }}>{qty}</span>
      }
    },
    { key: 'reorderLevel', label: 'Reorder', render: r => <span className="mono" style={{ fontSize: 12 }}>{r.reorderLevel}</span> },
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
          {canDeactivate && !r.isActive && (
            <button onClick={() => setReactivateMed(r)} className="icon-btn" title="Reactivate" style={{ color: '#3E8E5A' }}>
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
          <div className="pg-title">Medicines</div>
          <div className="pg-sub">
            {total} total
            {outCount > 0 && <span style={{ marginLeft: 8, color: 'var(--red-risk)', fontWeight: 600 }}>· {outCount} out of stock</span>}
            {lowCount > 0 && <span style={{ marginLeft: 8, color: '#C98A1E', fontWeight: 600 }}>· {lowCount} low stock</span>}
          </div>
        </div>
        {canAdd && (
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Medicine
          </button>
        )}
      </div>

      <div className="card">
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search by name, code or barcode..." />

          <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1) }} className="filter-select" style={{ minWidth: 130 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={manufacturerId} onChange={e => { setManufacturerId(e.target.value); setPage(1) }} className="filter-select" style={{ minWidth: 140 }}>
            <option value="">All Manufacturers</option>
            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {/* Prescription chip */}
          {[
            { v: '',      label: 'All Rx' },
            { v: 'true',  label: 'Rx Required' },
            { v: 'false', label: 'OTC' },
          ].map(p => (
            <button key={p.v}
              onClick={() => { setPrescriptionFilter(p.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: prescriptionFilter === p.v ? 'none' : '1px solid var(--rule)',
                background: prescriptionFilter === p.v ? 'var(--orange)' : 'var(--paper-light)',
                color: prescriptionFilter === p.v ? '#fff' : 'var(--steel)',
              }}
            >{p.label}</button>
          ))}

          {/* Active chip */}
          {[
            { v: 'true',  label: 'Active' },
            { v: 'false', label: 'Inactive' },
            { v: '',      label: 'Both' },
          ].map(a => (
            <button key={a.v}
              onClick={() => { setActiveFilter(a.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: activeFilter === a.v ? 'none' : '1px solid var(--rule)',
                background: activeFilter === a.v ? (a.v === 'false' ? '#6B7280' : 'var(--orange)') : 'var(--paper-light)',
                color: activeFilter === a.v ? '#fff' : 'var(--steel)',
              }}
            >{a.label}</button>
          ))}

          <div style={{ width: 1, background: 'var(--rule)', height: 20 }} />

          {/* Stock chip */}
          {[
            { v: '',    label: 'All Stock' },
            { v: 'low', label: `Low Stock${lowCount > 0 ? ` (${lowCount})` : ''}` },
            { v: 'out', label: `Out of Stock${outCount > 0 ? ` (${outCount})` : ''}` },
          ].map(s => (
            <button key={s.v}
              onClick={() => setStockFilter(s.v)}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: stockFilter === s.v ? 'none' : '1px solid var(--rule)',
                background: stockFilter === s.v ? (s.v === 'out' ? '#C23B2E' : s.v === 'low' ? '#C98A1E' : 'var(--orange)') : 'var(--paper-light)',
                color: stockFilter === s.v ? '#fff' : 'var(--steel)',
              }}
            >{s.label}</button>
          ))}
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

      <ConfirmDialog
        isOpen={!!reactivateMed}
        onClose={() => setReactivateMed(null)}
        onConfirm={() => reactivateMed && reactivateMutation.mutate(reactivateMed.id)}
        title="Reactivate Medicine"
        message={`Reactivate "${reactivateMed?.brandName}"? It will appear again in POS search.`}
        confirmLabel="Reactivate"
        loading={reactivateMutation.isPending}
      />
    </div>
  )
}
