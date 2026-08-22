import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Eye, Edit, PowerOff } from 'lucide-react'
import { api } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import MedicineForm from './MedicineForm'
import BatchListModal from './BatchListModal'

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
    onError: () => toast.error('Failed to deactivate'),
  })

  const columns: Column<Medicine>[] = [
    { key: 'productCode', label: 'Code' },
    { key: 'brandName', label: 'Brand Name' },
    { key: 'genericName', label: 'Generic Name' },
    { key: 'category', label: 'Category', render: (r) => r.category?.name ?? '—' },
    {
      key: 'totalQty', label: 'Stock', render: (r) => (
        <span className={Number(r.totalQty) <= r.reorderLevel ? 'text-red-600 font-semibold' : 'text-gray-700'}>
          {Number(r.totalQty)}
        </span>
      )
    },
    { key: 'reorderLevel', label: 'Reorder', render: (r) => String(r.reorderLevel) },
    {
      key: 'isActive', label: 'Status', render: (r) => (
        <Badge label={r.isActive ? 'Active' : 'Inactive'} variant={r.isActive ? 'green' : 'gray'} />
      )
    },
    {
      key: 'actions', label: 'Actions', render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchMed(r)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="View Batches"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => setEditMed(r)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
            title="Edit"
          >
            <Edit size={14} />
          </button>
          {r.isActive && (
            <button
              onClick={() => setDeactivateMed(r)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Deactivate"
            >
              <PowerOff size={14} />
            </button>
          )}
        </div>
      )
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Medicines</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="w-72">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search medicines..." />
          </div>
        </div>
        <Table columns={columns} data={medicines} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Medicine" size="lg">
        <MedicineForm
          onSuccess={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['medicines'] }) }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editMed} onClose={() => setEditMed(null)} title="Edit Medicine" size="lg">
        {editMed && (
          <MedicineForm
            initialData={editMed}
            onSuccess={() => { setEditMed(null); qc.invalidateQueries({ queryKey: ['medicines'] }) }}
            onCancel={() => setEditMed(null)}
          />
        )}
      </Modal>

      {/* Batch List Modal */}
      {batchMed && (
        <BatchListModal
          medicine={batchMed}
          onClose={() => setBatchMed(null)}
        />
      )}

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!deactivateMed}
        onClose={() => setDeactivateMed(null)}
        onConfirm={() => deactivateMed && deactivateMutation.mutate(deactivateMed.id)}
        title="Deactivate Medicine"
        message={`Are you sure you want to deactivate "${deactivateMed?.brandName}"?`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}
