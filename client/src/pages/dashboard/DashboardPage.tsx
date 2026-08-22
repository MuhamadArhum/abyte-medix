import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import {
  TrendingUp, ShoppingBag, AlertTriangle, Package,
  Banknote, ShieldAlert,
} from 'lucide-react'

const C = {
  primary: 'var(--orange)', border: 'var(--rule)', text: 'var(--ink)',
  subtext: 'var(--steel)', faint: 'var(--steel)',
  warn: '#B45309', warnBg: '#FEF3C7',
  danger: '#C24444', dangerBg: '#FDE7E7',
  expiry: '#9A3412', expiryBg: '#FFE4D5',
}
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function StatCard({ icon: Icon, label, value, tint }: {
  icon: React.ElementType; label: string; value: string | number; tint?: string
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.border}`, borderRadius: 'var(--radius)',
      padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 150,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 'var(--radius)', background: tint || 'rgba(62,142,90,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color={C.primary} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, ...MONO, color: C.text }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.subtext }}>{label}</div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: 11, color: C.subtext,
  textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: `1px solid ${C.border}`,
}
const td: React.CSSProperties = {
  padding: '8px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle',
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/medicines/low-stock').then((r) => r.data),
  })

  const { data: expiring } = useQuery({
    queryKey: ['expiring'],
    queryFn: () => api.get('/medicines/expiring?days=60').then((r) => r.data),
  })

  const { data: recentSalesData } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => api.get('/sales?page=1&limit=5').then((r) => r.data),
  })

  const { data: recentPurchasesData } = useQuery({
    queryKey: ['recent-purchases'],
    queryFn: () => api.get('/purchases?page=1&limit=5').then((r) => r.data),
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const fmtRs = (n: number) => `Rs ${Math.round(n || 0).toLocaleString('en-PK')}`
  const recentSales: any[] = recentSalesData?.data ?? []
  const recentPurchases: any[] = recentPurchasesData?.data ?? []
  const lowStock: any[] = lowStockData ?? []
  const nearExpiry: any[] = expiring ?? []

  return (
    <div>
      <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 700, color: C.text }}>
        {greeting}, {user?.fullName?.split(' ')[0]}
      </h2>
      <div style={{ fontSize: 12.5, color: C.faint, marginBottom: 20 }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <StatCard icon={Banknote}    label="Today's sales"       value={fmtRs(dash?.todaySales?.total ?? 0)} />
        <StatCard icon={TrendingUp}  label="Today's purchases"   value={fmtRs(dash?.todayPurchases?.total ?? 0)} />
        <StatCard icon={ShoppingBag} label="Today's invoices"    value={dash?.todaySales?.count ?? 0} />
        <StatCard icon={Package}     label="Stock value (MRP)"   value={fmtRs(dash?.stockValue?.atSalePrice ?? 0)} />
        <StatCard icon={ShieldAlert} label="Low stock items"     value={dash?.lowStockCount ?? 0} tint={C.warnBg} />
        <StatCard icon={AlertTriangle} label="Near-expiry items" value={nearExpiry.length} tint={C.expiryBg} />
      </div>

      {/* Tables Row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>

        {/* Recent Sales */}
        <div style={{ flex: '1 1 360px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.text }}>Recent Sales</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Invoice</th>
                <th style={th}>Customer</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s: any) => (
                <tr key={s.id}>
                  <td style={{ ...td, ...MONO, fontSize: 12, color: C.subtext }}>{s.invoiceNumber}</td>
                  <td style={td}>{s.customer?.name ?? 'Walk-in'}</td>
                  <td style={{ ...td, ...MONO, textAlign: 'right', fontWeight: 700, color: C.primary }}>
                    {fmtRs(Number(s.total))}
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr><td style={{ ...td, color: C.faint }} colSpan={3}>No sales yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Purchases */}
        <div style={{ flex: '1 1 360px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.text }}>Recent Purchases</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Invoice</th>
                <th style={th}>Supplier</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ ...td, ...MONO, fontSize: 12, color: C.subtext }}>{p.invoiceNumber}</td>
                  <td style={td}>{p.supplier?.name ?? '—'}</td>
                  <td style={{ ...td, ...MONO, textAlign: 'right', fontWeight: 700, color: C.primary }}>
                    {fmtRs(Number(p.total))}
                  </td>
                </tr>
              ))}
              {recentPurchases.length === 0 && (
                <tr><td style={{ ...td, color: C.faint }} colSpan={3}>No purchases yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Needs Attention */}
        <div style={{ flex: '1 1 300px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: C.text }}>Needs Attention</div>

          {lowStock.slice(0, 4).map((m: any) => (
            <div key={m.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12.5, padding: '7px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ color: C.text }}>{m.brandName}</span>
              <span style={{ color: C.warn, fontWeight: 700, background: C.warnBg, fontSize: 10.5, padding: '2px 8px', borderRadius: 'var(--radius)' }}>
                Low stock
              </span>
            </div>
          ))}

          {nearExpiry.slice(0, 3).map((b: any) => (
            <div key={b.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12.5, padding: '7px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <div style={{ color: C.text }}>{b.medicine?.brandName}</div>
                <div style={{ fontSize: 11, color: C.faint }}>Batch {b.batchNumber}</div>
              </div>
              <span style={{ color: C.expiry, fontWeight: 700, background: C.expiryBg, fontSize: 10.5, padding: '2px 8px', borderRadius: 'var(--radius)' }}>
                Expiring
              </span>
            </div>
          ))}

          {lowStock.length === 0 && nearExpiry.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.subtext }}>Stock levels look healthy.</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <div style={{ fontSize: 11.5, color: C.faint }}>
              Customer receivables
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.primary, ...MONO }}>
              {fmtRs(dash?.customerReceivables ?? 0)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ fontSize: 11.5, color: C.faint }}>Supplier payables</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#C24444', ...MONO }}>
              {fmtRs(dash?.supplierPayables ?? 0)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
