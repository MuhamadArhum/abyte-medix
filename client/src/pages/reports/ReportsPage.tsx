import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

function downloadCSV(rows: Record<string, unknown>[], headers: string[], keys: string[], filename: string) {
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

type Tab = 'sales' | 'purchases' | 'inventory' | 'pl'
type GroupBy = 'day' | 'month'

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--paper-light)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)', padding: '14px 16px', textAlign: 'center',
      minWidth: 0, /* prevent overflow in grid */
    }}>
      <div style={{ fontSize: 11, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{
        fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)',
        color: color ?? 'var(--ink)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// Compact Y-axis formatter: 1500000 → 1.5M, 25000 → 25K
const yFmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
  : String(v)

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [tab, setTab] = useState<Tab>('sales')
  const [from, setFrom] = useState(firstOfMonth)
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

  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ['report-pl', from, to],
    queryFn: () => api.get(`/reports/profit-loss?from=${from}&to=${to}`).then(r => r.data),
    enabled: tab === 'pl',
  })

  const salesRows: any[] = salesData ?? []
  const purchaseRows: any[] = purchasesData ?? []
  const totalSales = salesRows.reduce((s, d) => s + Number(d.total ?? 0), 0)
  const totalTransactions = salesRows.reduce((s, d) => s + Number(d.count ?? 0), 0)
  const totalPurchases = purchaseRows.reduce((s, d) => s + Number(d.total ?? 0), 0)
  const totalPurchaseOrders = purchaseRows.reduce((s, d) => s + Number(d.count ?? 0), 0)

  const valuationItems: any[] = valuation ?? []
  const totalCostVal = valuationItems.reduce((s, v) => s + Number(v.costValue ?? 0), 0)
  const totalSaleVal = valuationItems.reduce((s, v) => s + Number(v.saleValue ?? 0), 0)

  // Adaptive summary grid — wraps to 2 or 1 col at narrow widths
  const summaryGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
  }

  const dateFilterBar = (
    <div className="filter-bar" style={{ border: 'none', padding: '0 0 14px 0', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>From:</span>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="filter-select" />
      <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>To:</span>
      <input type="date" value={to} onChange={e => setTo(e.target.value)} className="filter-select" />
      {(tab === 'sales' || tab === 'purchases') && (
        <div style={{ display: 'flex', gap: 4 }}>
          {(['day', 'month'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)} style={{
              padding: '4px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: groupBy === g ? 'none' : '1px solid var(--rule)',
              background: groupBy === g ? 'var(--orange)' : 'var(--paper-light)',
              color: groupBy === g ? '#fff' : 'var(--steel)',
            }}>
              {g === 'day' ? 'Daily' : 'Monthly'}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => { setFrom(firstOfMonth); setTo(today) }}
        style={{ fontSize: 12, color: 'var(--steel)', background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '4px 10px', cursor: 'pointer' }}>
        This Month
      </button>
      <button onClick={() => { setFrom(today); setTo(today) }}
        style={{ fontSize: 12, color: 'var(--steel)', background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '4px 10px', cursor: 'pointer' }}>
        Today
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="pg-title">Reports</div>
        <div className="pg-sub">Sales, purchases and inventory analytics</div>
      </div>

      {/* Tab bar — wraps on narrow windows */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, background: 'var(--paper)', borderRadius: 'var(--radius)', padding: 3, border: '1px solid var(--rule)', width: 'fit-content', maxWidth: '100%', marginBottom: 16 }}>
        {(['sales', 'purchases', 'inventory', 'pl'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'pl' ? 'Profit & Loss' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Sales Tab ── */}
      {tab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {dateFilterBar}

          <div style={summaryGrid}>
            <SummaryCard label="Total Revenue" value={`Rs. ${totalSales.toLocaleString()}`} />
            <SummaryCard label="Transactions" value={String(totalTransactions)} />
            <SummaryCard
              label={groupBy === 'day' ? 'Avg / Day' : 'Avg / Month'}
              value={`Rs. ${salesRows.length ? Math.round(totalSales / salesRows.length).toLocaleString() : 0}`}
            />
          </div>

          <div className="card card-p">
            <h3 className="card-title">Sales Trend</h3>
            {salesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
            ) : salesRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--steel)' }}>No sales data for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesRows} margin={{ left: 10, right: 10, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={yFmt} width={50} />
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, 'Sales']} />
                  <Bar dataKey="total" fill="var(--orange)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>Top Selling Products</h3>
              <button onClick={() => downloadCSV(salesByProduct ?? [], ['Medicine', 'Qty Sold', 'Revenue'], ['brandName', 'totalQty', 'totalRevenue'], `sales-by-product-${from}-${to}.csv`)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--paper-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--steel)' }}>
                <Download size={13} /> Export CSV
              </button>
            </div>
            {productLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ minWidth: 400 }}>
                  <thead>
                    <tr>{['#', 'Medicine', 'Qty Sold', 'Revenue'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(salesByProduct ?? []).length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--steel)' }}>No data for selected period</td></tr>
                    ) : (
                      (salesByProduct ?? []).slice(0, 15).map((p: any, i: number) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--steel)', width: 36 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.brandName}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{p.totalQty}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Rs. {Number(p.totalRevenue).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>Sales by Customer</h3>
              <button onClick={() => downloadCSV(salesByCustomer ?? [], ['Customer', 'Transactions', 'Total Amount'], ['name', 'count', 'totalSales'], `sales-by-customer-${from}-${to}.csv`)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--paper-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--steel)' }}>
                <Download size={13} /> Export CSV
              </button>
            </div>
            {custLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ minWidth: 360 }}>
                  <thead>
                    <tr>{['Customer', 'Transactions', 'Total Amount'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(salesByCustomer ?? []).length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--steel)' }}>No data for selected period</td></tr>
                    ) : (
                      (salesByCustomer ?? []).slice(0, 15).map((c: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.count}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Rs. {Number(c.totalSales).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Purchases Tab ── */}
      {tab === 'purchases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {dateFilterBar}

          <div style={summaryGrid}>
            <SummaryCard label="Total Purchases" value={`Rs. ${totalPurchases.toLocaleString()}`} />
            <SummaryCard label="Purchase Orders" value={String(totalPurchaseOrders)} />
            <SummaryCard
              label={groupBy === 'day' ? 'Avg / Day' : 'Avg / Month'}
              value={`Rs. ${purchaseRows.length ? Math.round(totalPurchases / purchaseRows.length).toLocaleString() : 0}`}
            />
          </div>

          <div className="card card-p">
            <h3 className="card-title">Purchases Trend</h3>
            {purLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
            ) : purchaseRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--steel)' }}>No purchase data for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={purchaseRows} margin={{ left: 10, right: 10, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={yFmt} width={50} />
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, 'Purchases']} />
                  <Bar dataKey="total" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>Purchases by Supplier</h3>
              <button onClick={() => downloadCSV(purchasesBySupplier ?? [], ['Supplier', 'Orders', 'Total Amount'], ['name', 'count', 'totalPurchases'], `purchases-by-supplier-${from}-${to}.csv`)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--paper-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--steel)' }}>
                <Download size={13} /> Export CSV
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 360 }}>
                <thead>
                  <tr>{['Supplier', 'Orders', 'Total Amount'].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(purchasesBySupplier ?? []).length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--steel)' }}>No data for selected period</td></tr>
                  ) : (
                    (purchasesBySupplier ?? []).map((s: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{s.count}</td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Rs. {Number(s.totalPurchases).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Profit & Loss Tab ── */}
      {tab === 'pl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {dateFilterBar}

          {plLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          ) : plData ? (
            <>
              <div style={summaryGrid}>
                <SummaryCard label="Revenue" value={`Rs. ${Number(plData.revenue).toLocaleString()}`} />
                <SummaryCard label="Gross Profit" value={`Rs. ${Number(plData.grossProfit).toLocaleString()}`}
                  color={plData.grossProfit >= 0 ? 'var(--green-ok)' : 'var(--red-risk)'} />
                <SummaryCard label="Net Profit" value={`Rs. ${Number(plData.netProfit).toLocaleString()}`}
                  color={plData.netProfit >= 0 ? 'var(--green-ok)' : 'var(--red-risk)'}
                  sub={`Margin: ${Number(plData.grossMargin).toFixed(1)}%`} />
              </div>

              <div className="card card-p">
                <h3 className="card-title" style={{ marginBottom: 16 }}>P&L Statement</h3>
                <div style={{ maxWidth: 'min(600px, 100%)' }}>
                  {[
                    { label: 'Revenue (Sales)', value: plData.revenue, color: 'var(--ink)' },
                    { label: '− Cost of Goods Sold (COGS)', value: plData.cogs, color: 'var(--red-risk)', sub: true },
                    { label: 'Gross Profit', value: plData.grossProfit, color: plData.grossProfit >= 0 ? 'var(--green-ok)' : 'var(--red-risk)', bold: true, border: true },
                    { label: 'Gross Margin', value: `${Number(plData.grossMargin).toFixed(1)}%`, isString: true, color: 'var(--steel)', sub: true },
                    { label: '− Operating Expenses', value: plData.expenses, color: 'var(--red-risk)', sub: true },
                    { label: '+ Other Income', value: plData.otherIncome, color: 'var(--green-ok)', sub: true },
                    { label: 'Net Profit', value: plData.netProfit, color: plData.netProfit >= 0 ? 'var(--green-ok)' : 'var(--red-risk)', bold: true, border: true },
                  ].map((row: any, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 0', gap: 12,
                      borderTop: row.border ? '2px solid var(--rule)' : i > 0 ? '1px solid var(--rule)' : 'none',
                    }}>
                      <span style={{ fontSize: 13, color: row.sub ? 'var(--steel)' : 'var(--ink)', fontWeight: row.bold ? 700 : 400, flexShrink: 0 }}>
                        {row.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: row.bold ? 800 : 600, color: row.color, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                        {row.isString ? row.value : `Rs. ${Number(row.value).toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--steel)', borderTop: '1px solid var(--rule)', paddingTop: 10 }}>
                  Based on <strong>{plData.salesCount}</strong> completed sale(s) · {plData.period.from} → {plData.period.to}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--steel)', textAlign: 'center', padding: 32 }}>No data for selected period.</div>
          )}
        </div>
      )}

      {/* ── Inventory Tab ── */}
      {tab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={summaryGrid}>
            <SummaryCard label="Total SKUs" value={String(valuationItems.length)} />
            <SummaryCard label="Cost Value" value={`Rs. ${totalCostVal.toLocaleString()}`} />
            <SummaryCard label="Sale Value" value={`Rs. ${totalSaleVal.toLocaleString()}`} color="var(--green-ok)"
              sub={totalCostVal > 0 ? `Margin: ${(((totalSaleVal - totalCostVal) / totalCostVal) * 100).toFixed(1)}%` : undefined}
            />
          </div>

          <div className="card">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>Stock Valuation</h3>
              <button onClick={() => downloadCSV(valuationItems, ['Medicine', 'Qty', 'Cost Value', 'Sale Value'], ['brandName', 'totalQty', 'costValue', 'saleValue'], 'stock-valuation.csv')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--paper-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--steel)' }}>
                <Download size={13} /> Export CSV
              </button>
            </div>
            {valLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>{['Medicine', 'Qty', 'Cost Value', 'Sale Value', 'Margin %'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {valuationItems.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--steel)' }}>No inventory data</td></tr>
                    ) : (
                      <>
                        {valuationItems.map((v: any, i: number) => {
                          const margin = v.costValue > 0
                            ? (((v.saleValue - v.costValue) / v.costValue) * 100).toFixed(1)
                            : '0.0'
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{v.brandName}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{v.totalQty}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>Rs. {Number(v.costValue).toLocaleString()}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>Rs. {Number(v.saleValue).toLocaleString()}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-ok)', fontWeight: 600 }}>{margin}%</td>
                            </tr>
                          )
                        })}
                        <tr style={{ borderTop: '2px solid var(--rule)', background: 'var(--paper)' }}>
                          <td style={{ fontWeight: 700 }}>TOTAL</td>
                          <td style={{ color: 'var(--steel)' }}>—</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Rs. {totalCostVal.toLocaleString()}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Rs. {totalSaleVal.toLocaleString()}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-ok)', fontWeight: 700 }}>
                            {totalCostVal > 0 ? (((totalSaleVal - totalCostVal) / totalCostVal) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
