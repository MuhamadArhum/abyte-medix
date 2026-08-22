import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => api.get('/sales/summary').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/medicines/low-stock').then((r) => r.data),
  })

  const { data: expiring } = useQuery({
    queryKey: ['expiring'],
    queryFn: () => api.get('/medicines/expiring?days=30').then((r) => r.data),
  })

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Today's Sales"
          value={`Rs. ${Number(summary?._sum?.total ?? 0).toLocaleString()}`}
          sub={`${summary?._count?.id ?? 0} invoices`}
        />
        <StatCard label="Low Stock Items" value={lowStock?.length ?? 0} sub="Below reorder level" />
        <StatCard label="Expiring (30 days)" value={expiring?.length ?? 0} sub="Batches near expiry" />
        <StatCard label="Today's Discount" value={`Rs. ${Number(summary?._sum?.discountAmount ?? 0).toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Low Stock Medicines</h3>
          {lowStock?.length === 0 && <p className="text-sm text-gray-400">No low stock items</p>}
          <div className="space-y-2">
            {lowStock?.slice(0, 8).map((m: any) => (
              <div key={m.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{m.brandName}</span>
                <span className="text-red-500 font-medium">{Number(m.totalQty)} / {m.reorderLevel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Expiring Soon (30 days)</h3>
          {expiring?.length === 0 && <p className="text-sm text-gray-400">No near-expiry batches</p>}
          <div className="space-y-2">
            {expiring?.slice(0, 8).map((b: any) => (
              <div key={b.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{b.medicine.brandName} — {b.batchNumber}</span>
                <span className="text-orange-500 font-medium">
                  {new Date(b.expiryDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
