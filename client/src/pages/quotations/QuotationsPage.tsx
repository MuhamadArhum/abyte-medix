import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Trash2, Eye, Printer, ShoppingCart, X, Plus } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import { useAuthStore } from '../../store/auth.store'
import { ACTION_ROLES, canRole } from '../../config/rbac'

const C = {
  primary: '#E85D1F', bg: '#ECE8DB', border: '#D3CDBA',
  text: '#14181B', subtext: '#6B7178', faint: '#6B7178',
  danger: '#C23B2E', dangerBg: 'rgba(194,59,46,0.10)',
  purple: '#0E2A47', purpleBg: 'rgba(14,42,71,0.08)',
}
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

function fmtRs(n: number) { return 'Rs ' + Math.round(n || 0).toLocaleString('en-PK') }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

interface QuotItem {
  id: number
  batchId: number
  quantity: number
  saleRate: number
  discount: number
  taxRate: number
  total: number
  batch: {
    batchNumber: string
    expiryDate: string
    medicine: { brandName: string; strength: string; productCode?: string }
  }
}

interface Quotation {
  id: number
  invoiceNumber: string
  createdAt: string
  total: number
  notes?: string
  customer?: { id: number; name: string; phone: string }
  items: QuotItem[]
}

export default function QuotationsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const canDelete = canRole(user?.role, ACTION_ROLES.quotations.delete)
  const canLoad = canRole(user?.role, ACTION_ROLES.quotations.load)
  const [selected, setSelected] = useState<Quotation | null>(null)
  const [printing, setPrinting] = useState(false)

  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ['quotations'],
    queryFn: () => api.get('/sales/quotations').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sales/quotations/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Quotation deleted')
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['quotations'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const loadToPOS = (q: Quotation) => {
    localStorage.setItem('pos_load_quotation', JSON.stringify(q))
    navigate('/pos')
    toast.info('Quotation loaded into POS cart')
  }

  const printQuotation = (q: Quotation) => {
    setPrinting(true)
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) { toast.error('Allow popups to print'); setPrinting(false); return }

    const subtotal = q.items.reduce((s, i) => s + i.quantity * i.saleRate, 0)
    const discAmt = q.items.reduce((s, i) => s + (i.quantity * i.saleRate * i.discount) / 100, 0)
    const rows = q.items.map(i => `
      <tr>
        <td>${i.batch.medicine.brandName} ${i.batch.medicine.strength}</td>
        <td style="text-align:center">${i.batch.batchNumber}</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right">Rs ${i.saleRate.toLocaleString()}</td>
        <td style="text-align:right">${i.discount > 0 ? i.discount + '%' : '—'}</td>
        <td style="text-align:right">Rs ${Math.round(i.total).toLocaleString()}</td>
      </tr>`).join('')

    win.document.write(`<!DOCTYPE html><html><head><title>Quotation ${q.invoiceNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20mm 18mm; }
      h1 { font-size: 18px; margin: 0; } h2 { font-size: 13px; margin: 0; color: #555; }
      .header { text-align: center; border-bottom: 2px solid #0E2A47; padding-bottom: 10px; margin-bottom: 14px; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #0E2A47; color: #fff; padding: 6px 8px; text-align: left; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; }
      .totals { margin-top: 12px; text-align: right; font-size: 12px; }
      .total-row { font-size: 15px; font-weight: bold; color: #E85D1F; margin-top: 6px; }
      .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
      @media print { body { padding: 10mm; } }
    </style></head><body>
    <div class="header">
      <h1>AbyteMedix Pharmacy</h1>
      <h2>QUOTATION</h2>
    </div>
    <div class="meta">
      <div><b>Quotation #:</b> ${q.invoiceNumber}<br><b>Date:</b> ${fmtDate(q.createdAt)}<br><b>Time:</b> ${fmtTime(q.createdAt)}</div>
      <div><b>Customer:</b> ${q.customer?.name ?? 'Walk-in'}<br>${q.customer?.phone ? '<b>Phone:</b> ' + q.customer.phone : ''}</div>
    </div>
    <table>
      <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div>Subtotal: Rs ${Math.round(subtotal).toLocaleString()}</div>
      ${discAmt > 0 ? `<div>Discount: -Rs ${Math.round(discAmt).toLocaleString()}</div>` : ''}
      <div class="total-row">Total: Rs ${Math.round(q.total).toLocaleString()}</div>
    </div>
    ${q.notes ? `<div style="margin-top:12px;font-size:11px;color:#555"><b>Notes:</b> ${q.notes}</div>` : ''}
    <div class="footer">
      <div>Valid for 7 days from date of quotation</div>
      <div>Prepared by: AbyteMedix</div>
    </div>
    <script>window.onload=function(){window.print();window.close()}</script>
    </body></html>`)
    win.document.close()
    setPrinting(false)
  }

  const list: Quotation[] = quotations ?? []

  return (
    <div className="pg">
      {/* Header */}
      <div className="pg-header">
        <div>
          <div className="pg-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color={C.purple} /> Quotations
          </div>
          <div className="pg-sub">{list.length} saved quotation{list.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => navigate('/pos')}
          className="btn btn-primary"
          style={{ background: C.purple }}
        >
          <Plus size={14} /> New Quotation (Go to POS)
        </button>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 16px', color: C.faint }}>
            <FileText size={36} color={C.border} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: C.subtext }}>No quotations yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Go to POS → add items → click "Quote / Save"</div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Quotation No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((q, idx) => (
                <tr key={q.id}>
                  <td style={{ color: C.faint, fontSize: 11 }}>{idx + 1}</td>
                  <td>
                    <span style={{ ...MONO, fontSize: 12, fontWeight: 700, color: C.purple }}>
                      {q.invoiceNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{fmtDate(q.createdAt)}</div>
                    <div style={{ fontSize: 10.5, color: C.faint }}>{fmtTime(q.createdAt)}</div>
                  </td>
                  <td>
                    {q.customer ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{q.customer.name}</div>
                        <div style={{ fontSize: 11, color: C.faint }}>{q.customer.phone}</div>
                      </>
                    ) : (
                      <span style={{ color: C.faint, fontSize: 12 }}>Walk-in</span>
                    )}
                  </td>
                  <td>
                    <span style={{
                      background: C.purpleBg, color: C.purple,
                      borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {q.items?.length ?? 0} items
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, ...MONO, color: C.primary }}>
                    {fmtRs(q.total)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        onClick={() => setSelected(q)}
                        className="icon-btn" title="View Detail"
                        style={{ color: C.purple }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => printQuotation(q)}
                        disabled={printing}
                        className="icon-btn" title="Print"
                      >
                        <Printer size={14} />
                      </button>
                      {canLoad && (
                        <button
                          onClick={() => loadToPOS(q)}
                          className="icon-btn success" title="Load to POS"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete quotation ${q.invoiceNumber}?`))
                              deleteMutation.mutate(q.id)
                          }}
                          className="icon-btn danger" title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,36,30,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16,
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 640,
            maxHeight: '88vh', overflowY: 'auto',
            boxShadow: '0 16px 48px rgba(11,110,92,0.15)',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color={C.purple} />
                  {selected.invoiceNumber}
                </div>
                <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                  {fmtDate(selected.createdAt)} · {fmtTime(selected.createdAt)}
                  {selected.customer && ` · ${selected.customer.name}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => printQuotation(selected)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                    background: '#fff', color: C.text, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  <Printer size={13} /> Print
                </button>
                {canLoad && (
                  <button
                    onClick={() => loadToPOS(selected)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: C.primary, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    <ShoppingCart size={13} /> Load to POS
                  </button>
                )}
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Customer info */}
            {selected.customer && (
              <div style={{
                margin: '14px 20px 0', padding: '10px 14px',
                background: C.purpleBg, borderRadius: 8, fontSize: 12,
              }}>
                <span style={{ fontWeight: 700, color: C.purple }}>Customer: </span>
                <span style={{ color: C.text }}>{selected.customer.name}</span>
                {selected.customer.phone && (
                  <span style={{ color: C.faint, marginLeft: 12 }}>{selected.customer.phone}</span>
                )}
              </div>
            )}

            {/* Items table */}
            <div style={{ padding: '14px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint, letterSpacing: '0.04em' }}>#</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint, letterSpacing: '0.04em' }}>Medicine</th>
                    <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint }}>Batch</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint }}>Qty</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint }}>Rate</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint }}>Disc%</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: C.faint }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '8px 10px', color: C.faint, fontSize: 11 }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: C.text }}>
                          {item.batch.medicine.brandName}
                          <span style={{ fontWeight: 400, color: C.faint, marginLeft: 6 }}>{item.batch.medicine.strength}</span>
                        </div>
                        {item.batch.medicine.productCode && (
                          <div style={{ fontSize: 10.5, color: C.faint, ...MONO }}>{item.batch.medicine.productCode}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', ...MONO, fontSize: 11.5, color: C.subtext }}>
                        {item.batch.batchNumber}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', ...MONO }}>{fmtRs(item.saleRate)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: item.discount > 0 ? '#2F8F5F' : C.faint }}>
                        {item.discount > 0 ? item.discount + '%' : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, ...MONO, color: C.primary }}>
                        {fmtRs(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <div style={{ width: 220 }}>
                  {(() => {
                    const sub = selected.items.reduce((s, i) => s + i.quantity * i.saleRate, 0)
                    const disc = selected.items.reduce((s, i) => s + (i.quantity * i.saleRate * i.discount) / 100, 0)
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.subtext, marginBottom: 4 }}>
                          <span>Subtotal</span><span style={MONO}>{fmtRs(sub)}</span>
                        </div>
                        {disc > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.danger, marginBottom: 4 }}>
                            <span>Discount</span><span style={MONO}>-{fmtRs(disc)}</span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 16, fontWeight: 800, color: C.primary,
                          borderTop: `2px solid ${C.border}`, paddingTop: 8, marginTop: 4,
                        }}>
                          <span>Total</span><span style={MONO}>{fmtRs(selected.total)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {selected.notes && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: C.bg, borderRadius: 8, fontSize: 12, color: C.subtext }}>
                  <span style={{ fontWeight: 600 }}>Notes: </span>{selected.notes}
                </div>
              )}

              {/* Footer actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete quotation ${selected.invoiceNumber}?`))
                        deleteMutation.mutate(selected.id)
                    }}
                    disabled={deleteMutation.isPending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 9, border: 'none',
                      background: C.dangerBg, color: C.danger, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {deleteMutation.isPending ? <Spinner size="sm" /> : <Trash2 size={14} />} Delete
                  </button>
                )}
                {canLoad && (
                  <button
                    onClick={() => loadToPOS(selected)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 20px', borderRadius: 9, border: 'none',
                      background: C.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    <ShoppingCart size={14} /> Convert to Sale
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
