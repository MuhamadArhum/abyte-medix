import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

type Tab = 'sales' | 'purchases' | 'inventory'
type GroupBy = 'day' | 'month'

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 8) + '01'

  const [tab, setTab] = useState<Tab>('sales')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState<GroupBy>('day')

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', from, to, groupBy],
    queryFn: () => api.get(`/reports/sales?from=${from}&to=${to}&groupBy=${groupBy}`).then(r => r.data),
    enabled: tab === 'sales',
  })

  const { data: salesByProduct, isLoading: productLoading } = useQuery({
    queryKey: ['report-sales-product', from, to],
    queryFn: () => api.get(`/reports/sales/by-product?from=${from}&to=${to}`).then(r => r.data),
    enabled: tab === 'sales',
  })

  const { data: salesByCustomer, isLoading: custLoading } = useQuery({
    queryKey: ['report-sales-customer', from, to],
    queryFn: () => api.get(`/reports/sales/by-customer?from=${from}&to=${to}`).then(r => r.data),
    enabled: tab === 'sales',
  })

  const { data: purchasesData, isLoading: purLoading } = useQuery({
    queryKey: ['report-purchases', from, to, groupBy],
    queryFn: () => api.get(`/reports/purchases?from=${from}&to=${to}&groupBy=${groupBy}`).then(r => r.data),
    enabled: tab === 'purchases',
  })

  const { data: purchasesBySupplier } = useQuery({
    queryKey: ['report-purchases-supplier', from, to],
    queryFn: () => api.get(`/reports/purchases/by-supplier?from=${from}&to=${to}`).then(r => r.data),
    enabled: tab === 'purchases',
  })

  const { data: valuation, isLoading: valLoading } = useQuery({
    queryKey: ['report-valuation'],
    queryFn: () => api.get('/reports/inventory/valuation').then(r => r.data),
    enabled: tab === 'inventory',
  })

  const chartData = (tab === 'sales' ? salesData : purchasesData) ?? []
  const chartLoading = tab === 'sales' ? salesLoading : purLoading

  const totalSales = (salesData ?? []).reduce((s: number, d: any) => s + Number(d.total ?? d.amount ?? 0), 0)
  const totalPurchases = (purchasesData ?? []).reduce((s: number, d: any) => s + Number(d.total ?? d.amount ?? 0), 0)

  const valuationItems = valuation?.data ?? valuation ?? []
  const totalCostVal = valuationItems.reduce((s: number, v: any) => s + Number(v.costValue ?? 0), 0)
  const totalSaleVal = valuationItems.reduce((s: number, v: any) => s + Number(v.saleValue ?? 0), 0)

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Reports</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['sales', 'purchases', 'inventory'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== 'inventory' && (
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['day', 'month'] as GroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1.5 rounded text-sm font-medium capitalize ${groupBy === g ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {g === 'day' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Total Sales" value={`Rs. ${totalSales.toLocaleString()}`} />
            <SummaryCard label="Transactions" value={String(salesData?.length ?? 0)} />
            <SummaryCard label="Avg per Day" value={`Rs. ${salesData?.length ? (totalSales / salesData.length).toFixed(0) : 0}`} />
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Sales Trend</h3>
            {chartLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={groupBy === 'day' ? 'date' : 'month'} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`Rs. ${Number(v).toLocaleString()}`, 'Sales']} />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* By Product */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">Top Selling Products</h3>
            </div>
            {productLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'Medicine', 'Qty Sold', 'Revenue'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(salesByProduct ?? []).slice(0, 15).map((p: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{p.medicineName ?? p.medicine?.brandName ?? p.name}</td>
                      <td className="px-4 py-2.5">{p.totalQty ?? p.quantity ?? 0}</td>
                      <td className="px-4 py-2.5 font-semibold">Rs. {Number(p.totalRevenue ?? p.total ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!productLoading && (salesByProduct ?? []).length === 0 && (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* By Customer */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">Sales by Customer</h3>
            </div>
            {custLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Customer', 'Transactions', 'Total Amount'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(salesByCustomer ?? []).slice(0, 15).map((c: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{c.customerName ?? c.customer?.name ?? 'Walk-in'}</td>
                      <td className="px-4 py-2.5">{c.count ?? c.transactions ?? 0}</td>
                      <td className="px-4 py-2.5 font-semibold">Rs. {Number(c.totalAmount ?? c.total ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!custLoading && (salesByCustomer ?? []).length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-gray-400">No data</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Purchases Tab */}
      {tab === 'purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard label="Total Purchases" value={`Rs. ${totalPurchases.toLocaleString()}`} />
            <SummaryCard label="Purchase Orders" value={String(purchasesData?.length ?? 0)} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Purchases Trend</h3>
            {purLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey={groupBy === 'day' ? 'date' : 'month'} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`Rs. ${Number(v).toLocaleString()}`, 'Purchases']} />
                  <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">Purchases by Supplier</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Supplier', 'Orders', 'Total Amount'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(purchasesBySupplier ?? []).map((s: any, i: number) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{s.supplierName ?? s.supplier?.name}</td>
                    <td className="px-4 py-2.5">{s.count ?? s.orders ?? 0}</td>
                    <td className="px-4 py-2.5 font-semibold">Rs. {Number(s.totalAmount ?? s.total ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
                {(purchasesBySupplier ?? []).length === 0 && (
                  <tr><td colSpan={3} className="text-center py-6 text-gray-400">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Total SKUs" value={String(valuationItems.length)} />
            <SummaryCard label="Cost Value" value={`Rs. ${totalCostVal.toLocaleString()}`} />
            <SummaryCard label="Sale Value" value={`Rs. ${totalSaleVal.toLocaleString()}`} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">Stock Valuation</h3>
            </div>
            {valLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Medicine', 'Total Qty', 'Cost Value', 'Sale Value', 'Margin'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {valuationItems.map((v: any, i: number) => {
                    const margin = v.costValue > 0
                      ? (((v.saleValue - v.costValue) / v.costValue) * 100).toFixed(1)
                      : '0.0'
                    return (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium">{v.medicineName ?? v.medicine?.brandName}</td>
                        <td className="px-4 py-2.5">{v.totalQty ?? 0}</td>
                        <td className="px-4 py-2.5">Rs. {Number(v.costValue ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5">Rs. {Number(v.saleValue ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-green-600 font-medium">{margin}%</td>
                      </tr>
                    )
                  })}
                  {/* Total row */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3">Rs. {totalCostVal.toLocaleString()}</td>
                    <td className="px-4 py-3">Rs. {totalSaleVal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">
                      {totalCostVal > 0 ? (((totalSaleVal - totalCostVal) / totalCostVal) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
