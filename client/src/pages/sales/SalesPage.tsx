import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, X, RotateCcw, Printer } from 'lucide-react'
import { api } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import SearchInput from '../../components/ui/SearchInput'
import Badge from '../../components/ui/Badge'

function KbdTag({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'var(--font-mono)',
      color: '#fff', fontWeight: 600, lineHeight: 1.6,
    }}>{children}</kbd>
  )
}

interface SaleSummary {
  id: number
  invoiceNumber: string
  createdAt: string
  total: string
  amountPaid: string
  changeAmount: string
  paymentMethod: string
  status: string
  customer: { id: number; name: string; phone: string } | null
  user: { fullName: string } | null
}

interface SaleDetail {
  id: number
  invoiceNumber: string
  createdAt: string
  total: string
  subtotal: string
  discountAmount: string
  taxAmount: string
  amountPaid: string
  changeAmount: string
  paymentMethod: string
  notes?: string
  status: string
  customer: { id: number; name: string; phone: string } | null
  user: { fullName: string } | null
  items: {
    id: number; quantity: number; saleRate: string; discount: number; taxRate: number; total: string
    batch: { batchNumber: string; expiryDate: string; medicine: { brandName: string; strength: string; productCode?: string } }
  }[]
}

const C = {
  primary: '#D9A441', border: '#D9D4C6', text: '#17181A',
  subtext: '#75797D', faint: '#75797D', danger: '#C23B2E',
  dangerBg: 'rgba(194,59,46,0.10)',
}
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function fmtRs(n: number | string) { return 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-PK') }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) }

function SaleDetailModal({ saleId, onClose, storeName }: { saleId: number; onClose: () => void; storeName: string }) {
  const { data, isLoading } = useQuery<SaleDetail>({
    queryKey: ['sale-detail', saleId],
    queryFn: () => api.get(`/sales/${saleId}`).then(r => r.data),
  })

  const printSale = (s: SaleDetail) => {
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) return
    const rows = s.items.map(i => `
      <tr>
        <td>${i.batch.medicine.brandName} ${i.batch.medicine.strength}</td>
        <td style="text-align:center">${i.batch.batchNumber}</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right">Rs ${Number(i.saleRate).toLocaleString()}</td>
        <td style="text-align:right">${i.discount > 0 ? i.discount + '%' : '—'}</td>
        <td style="text-align:right">Rs ${Math.round(Number(i.total)).toLocaleString()}</td>
      </tr>`).join('')
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${s.invoiceNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20mm 18mm; }
      .header { text-align: center; border-bottom: 2px solid #D9A441; padding-bottom: 10px; margin-bottom: 14px; }
      h1 { font-size: 18px; margin: 0; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #2B2F33; color: #fff; padding: 6px 8px; text-align: left; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; }
      .totals { margin-top: 12px; text-align: right; font-size: 12px; }
      .total-row { font-size: 15px; font-weight: bold; color: #D9A441; margin-top: 6px; }
      @media print { body { padding: 10mm; } }
    </style></head><body>
    <div class="header"><h1>${storeName}</h1><div style="color:#555">SALES INVOICE</div></div>
    <div class="meta">
      <div><b>Invoice #:</b> ${s.invoiceNumber}<br><b>Date:</b> ${fmtDate(s.createdAt)}<br><b>Time:</b> ${fmtTime(s.createdAt)}</div>
      <div><b>Customer:</b> ${s.customer?.name ?? 'Walk-in'}<br>${s.customer?.phone ? '<b>Phone:</b> ' + s.customer.phone : ''}</div>
    </div>
    <table>
      <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      ${Number(s.discountAmount) > 0 ? `<div>Subtotal: Rs ${Math.round(Number(s.subtotal)).toLocaleString()}</div>` : ''}
      ${Number(s.discountAmount) > 0 ? `<div>Discount: -Rs ${Math.round(Number(s.discountAmount)).toLocaleString()}</div>` : ''}
      ${Number(s.taxAmount) > 0 ? `<div>Tax: Rs ${Math.round(Number(s.taxAmount)).toLocaleString()}</div>` : ''}
      <div class="total-row">Total: Rs ${Math.round(Number(s.total)).toLocaleString()}</div>
      <div>Paid: Rs ${Math.round(Number(s.amountPaid)).toLocaleString()} (${s.paymentMethod})</div>
      ${s.paymentMethod === 'CASH' ? `<div>Change: Rs ${Math.round(Number(s.changeAmount)).toLocaleString()}</div>` : ''}
    </div>
    ${s.notes ? `<div style="margin-top:12px;font-size:11px;color:#555"><b>Notes:</b> ${s.notes}</div>` : ''}
    <div style="margin-top:30px;text-align:center;font-size:11px;color:#888">Thank you — get well soon!</div>
    <script>window.onload=function(){window.print();window.close()}</script>
    </body></html>`)
    win.document.close()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(27,30,33,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, width: 680, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 16px 48px rgba(27,30,33,0.2)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>
              {data ? data.invoiceNumber : '…'}
            </div>
            {data && (
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                {fmtDate(data.createdAt)} · {fmtTime(data.createdAt)}
                {data.user && ` · By ${data.user.fullName}`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {data && (
              <button onClick={() => printSale(data)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff',
                color: C.text, fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
                <Printer size={13} /> Print
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: C.faint }}>Loading…</div>
        )}

        {data && (
          <div style={{ padding: '16px 20px' }}>
            {data.customer && (
              <div style={{ display: 'flex', gap: 24, padding: '10px 14px', background: 'var(--paper)', borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                <div><span style={{ color: C.faint }}>Customer:</span> <span style={{ fontWeight: 700 }}>{data.customer.name}</span></div>
                <div><span style={{ color: C.faint }}>Phone:</span> {data.customer.phone}</div>
                <div><span style={{ color: C.faint }}>Payment:</span> <span style={{ fontWeight: 700 }}>{data.paymentMethod}</span></div>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--paper)' }}>
                  {['#', 'Medicine', 'Batch', 'Qty', 'Rate', 'Disc%', 'Total'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h === '#' || h === 'Qty' || h === 'Rate' || h === 'Disc%' || h === 'Total' ? 'right' : 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint, letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: C.faint, fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600 }}>{item.batch.medicine.brandName} <span style={{ fontWeight: 400, color: C.faint }}>{item.batch.medicine.strength}</span></div>
                      {item.batch.medicine.productCode && <div style={{ fontSize: 10.5, color: C.faint, ...MONO }}>{item.batch.medicine.productCode}</div>}
                    </td>
                    <td style={{ padding: '8px 10px', ...MONO, fontSize: 11.5, color: C.subtext }}>{item.batch.batchNumber}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', ...MONO }}>{fmtRs(item.saleRate)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: item.discount > 0 ? '#2F8F5F' : C.faint }}>{item.discount > 0 ? item.discount + '%' : '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, ...MONO, color: C.primary }}>{fmtRs(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{ width: 220 }}>
                {Number(data.discountAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.subtext, marginBottom: 4 }}>
                    <span>Subtotal</span><span style={MONO}>{fmtRs(data.subtotal)}</span>
                  </div>
                )}
                {Number(data.discountAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.danger, marginBottom: 4 }}>
                    <span>Discount</span><span style={MONO}>-{fmtRs(data.discountAmount)}</span>
                  </div>
                )}
                {Number(data.taxAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.subtext, marginBottom: 4 }}>
                    <span>Tax</span><span style={MONO}>{fmtRs(data.taxAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: C.primary, borderTop: `2px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                  <span>Total</span><span style={MONO}>{fmtRs(data.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.subtext, marginTop: 6 }}>
                  <span>Paid ({data.paymentMethod})</span><span style={MONO}>{fmtRs(data.amountPaid)}</span>
                </div>
                {data.paymentMethod === 'CASH' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.subtext }}>
                    <span>Change</span><span style={MONO}>{fmtRs(data.changeAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {data.notes && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--paper)', borderRadius: 8, fontSize: 12, color: C.subtext }}>
                <span style={{ fontWeight: 600 }}>Notes: </span>{data.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SalesPage() {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const storeName = settings?.store_name || 'AbyteMedix Pharmacy'
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [paymentFilter, setPaymentFilter] = useState('')
  const [viewSaleId, setViewSaleId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, limit, search, from, to, paymentFilter],
    queryFn: () => api.get(
      `/sales?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&from=${from}&to=${to}&paymentMethod=${paymentFilter}`
    ).then(r => r.data),
  })

  const sales: SaleSummary[] = data?.data ?? []
  const total: number = data?.total ?? 0

  const hasFilters = search || paymentFilter || from !== today || to !== today
  const clearFilters = () => { setSearch(''); setPaymentFilter(''); setFrom(today); setTo(today); setPage(1) }

  const columns: Column<SaleSummary>[] = [
    { key: 'invoiceNumber', label: 'Invoice #', render: r => <span style={{ ...MONO, fontSize: 12, color: C.subtext }}>{r.invoiceNumber}</span> },
    { key: 'createdAt', label: 'Date & Time', render: r => (
      <div>
        <div style={{ fontSize: 12.5 }}>{fmtDate(r.createdAt)}</div>
        <div style={{ fontSize: 11, color: C.faint }}>{fmtTime(r.createdAt)}</div>
      </div>
    )},
    { key: 'customer', label: 'Customer', render: r => r.customer ? (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.customer.name}</div>
        <div style={{ fontSize: 11, color: C.faint }}>{r.customer.phone}</div>
      </div>
    ) : <span style={{ color: C.faint, fontSize: 12 }}>Walk-in</span> },
    { key: 'total', label: 'Total', render: r => <span style={{ ...MONO, fontWeight: 800, color: C.primary }}>Rs {Math.round(Number(r.total)).toLocaleString()}</span> },
    { key: 'amountPaid', label: 'Paid', render: r => <span style={{ ...MONO, color: r.paymentMethod === 'CREDIT' ? '#C23B2E' : '#2F8F5F' }}>Rs {Math.round(Number(r.amountPaid)).toLocaleString()}</span> },
    { key: 'paymentMethod', label: 'Payment', render: r => (
      <Badge
        label={r.paymentMethod}
        variant={r.paymentMethod === 'CASH' ? 'green' : r.paymentMethod === 'CREDIT' ? 'red' : 'neutral'}
      />
    )},
    { key: 'user', label: 'By', render: r => <span style={{ fontSize: 11.5, color: C.faint }}>{r.user?.fullName ?? '—'}</span> },
    { key: 'actions', label: '', render: r => (
      <button onClick={() => setViewSaleId(r.id)} className="icon-btn" title="View"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--orange)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--steel)' }}>
        <Eye size={14} />
      </button>
    )},
  ]

  // Summary calculations from current page
  const pageTotal = sales.reduce((s, r) => s + Number(r.total), 0)
  const pageCash = sales.filter(r => r.paymentMethod === 'CASH').reduce((s, r) => s + Number(r.total), 0)
  const pageCredit = sales.filter(r => r.paymentMethod === 'CREDIT').reduce((s, r) => s + Number(r.total), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>Sales History</h1>
          <div style={{ fontSize: 12.5, color: 'var(--steel)', marginTop: 2 }}>Complete sales transaction log</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--steel)' }}>Page Total</div>
            <div style={{ ...MONO, fontWeight: 800, fontSize: 16, color: C.primary }}>Rs {Math.round(pageTotal).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#2F8F5F' }}>Cash</div>
            <div style={{ ...MONO, fontWeight: 700, fontSize: 14, color: '#2F8F5F' }}>Rs {Math.round(pageCash).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.danger }}>Credit</div>
            <div style={{ ...MONO, fontWeight: 700, fontSize: 14, color: C.danger }}>Rs {Math.round(pageCredit).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput inputRef={searchRef} value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search invoice or customer… (F2)" />

          <span style={{ fontSize: 12, color: 'var(--steel)' }}>From:</span>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} className="filter-select" />
          <span style={{ fontSize: 12, color: 'var(--steel)' }}>To:</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} className="filter-select" />

          {[
            { v: '',       label: 'All' },
            { v: 'CASH',   label: 'Cash' },
            { v: 'CREDIT', label: 'Credit' },
          ].map(p => (
            <button key={p.v}
              onClick={() => { setPaymentFilter(p.v); setPage(1) }}
              style={{
                padding: '4px 11px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: paymentFilter === p.v ? 'none' : '1px solid var(--rule)',
                background: paymentFilter === p.v ? (p.v === 'CREDIT' ? '#C23B2E' : 'var(--orange)') : 'var(--paper-light)',
                color: paymentFilter === p.v ? '#fff' : 'var(--steel)',
              }}
            >{p.label}</button>
          ))}

          {hasFilters && (
            <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--steel)', background: 'none', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={11} /> Clear
            </button>
          )}
          <span style={{ marginLeft: hasFilters ? 0 : 'auto', fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap' }}>{total} records</span>
        </div>

        <Table columns={columns} data={sales} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>

      {viewSaleId && <SaleDetailModal saleId={viewSaleId} onClose={() => setViewSaleId(null)} storeName={storeName} />}

      <div style={{
        position: 'fixed', bottom: 0, left: 200, right: 0, height: 32,
        background: 'var(--ink)', display: 'flex', alignItems: 'center',
        gap: 20, paddingLeft: 20, zIndex: 40,
      }}>
        {[{ key: 'F2', label: 'Search' }].map(s => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            <KbdTag>{s.key}</KbdTag> {s.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', paddingRight: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          <RotateCcw size={10} style={{ marginRight: 4, display: 'inline' }} />
          Sales History — read-only
        </span>
      </div>
    </div>
  )
}
