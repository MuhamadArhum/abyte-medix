import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" }
const th: React.CSSProperties = {
  padding: '7px 8px', textAlign: 'left', fontSize: 11,
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
  color: '#fff', background: '#0E2A47',
}
const td: React.CSSProperties = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid #D3CDBA', verticalAlign: 'middle' }

/* ─── Sale Invoice ─── */
export interface SaleReceiptData {
  invoiceNumber: string
  date: Date
  customerName: string
  lines: { medicineName: string; qty: number; saleRate?: number; total: number }[]
  subtotal: number
  discountAmt: number
  taxAmt: number
  total: number
  paid: number
  change: number
  paymentMethod: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
}

function SaleInvoice({ d }: { d: SaleReceiptData }) {
  const store = d.storeName || 'AbyteMedix Pharmacy'
  const addr = d.storeAddress || ''
  const phone = d.storePhone || ''

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', Arial, sans-serif", color: '#14181B', padding: '0', minHeight: '297mm', width: '210mm', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #0E2A47', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Oswald', Arial, sans-serif", fontSize: 22, fontWeight: 700, color: '#0E2A47', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{store}</div>
            {addr && <div style={{ fontSize: 12, color: '#6B7178', marginTop: 2 }}>{addr}</div>}
            {phone && <div style={{ fontSize: 12, color: '#6B7178' }}>Tel: {phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Oswald', Arial, sans-serif", fontSize: 18, fontWeight: 700, color: '#E85D1F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sale Invoice</div>
            <div style={{ ...mono, fontSize: 13, fontWeight: 700, marginTop: 4 }}>#{d.invoiceNumber}</div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, background: '#ECE8DB', borderRadius: 4, padding: '12px 14px' }}>
        <div>
          <div style={{ fontSize: 10, color: '#6B7178', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Bill To</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{d.customerName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#6B7178', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Invoice Date</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div style={{ fontSize: 11, color: '#6B7178', marginTop: 2 }}>{d.date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 28 }}>#</th>
            <th style={{ ...th }}>Medicine</th>
            <th style={{ ...th, textAlign: 'center', width: 60 }}>Qty</th>
            <th style={{ ...th, textAlign: 'right', width: 90 }}>Rate</th>
            <th style={{ ...th, textAlign: 'right', width: 100 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F5F2E8' }}>
              <td style={{ ...td, color: '#6B7178' }}>{i + 1}</td>
              <td style={{ ...td, fontWeight: 600 }}>{l.medicineName}</td>
              <td style={{ ...td, textAlign: 'center', ...mono }}>{l.qty}</td>
              <td style={{ ...td, textAlign: 'right', ...mono }}>Rs. {Number(l.saleRate ?? (l.total / l.qty)).toFixed(2)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700, ...mono }}>Rs. {Number(l.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ width: 240 }}>
          <Row label="Subtotal" value={`Rs. ${d.subtotal.toFixed(2)}`} />
          {d.discountAmt > 0 && <Row label="Discount" value={`- Rs. ${d.discountAmt.toFixed(2)}`} color="#C23B2E" />}
          {d.taxAmt > 0 && <Row label="Tax" value={`Rs. ${d.taxAmt.toFixed(2)}`} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0E2A47', marginTop: 6, paddingTop: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>TOTAL</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#E85D1F', ...mono }}>Rs. {d.total.toFixed(2)}</span>
          </div>
          {d.paymentMethod === 'CASH' && (
            <>
              <Row label="Cash Received" value={`Rs. ${d.paid.toFixed(2)}`} mt={8} />
              <Row label="Change" value={`Rs. ${d.change.toFixed(2)}`} color="#3E8E5A" />
            </>
          )}
          {d.paymentMethod === 'CARD' && <Row label="Payment" value="Card" mt={8} />}
          {d.paymentMethod === 'CREDIT' && <Row label="Payment" value="Credit / Due" color="#C23B2E" mt={8} />}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px dashed #D3CDBA', paddingTop: 12, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Oswald', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: '#E85D1F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Thank you for your purchase!</div>
        <div style={{ fontSize: 11, color: '#6B7178', marginTop: 3 }}>Get well soon · {store}</div>
      </div>
    </div>
  )
}

/* ─── Purchase Invoice ─── */
export interface PurchaseInvoiceData {
  invoiceNumber: string
  purchaseDate: string
  supplier: { name: string; phone?: string }
  items: {
    medicine?: { brandName: string }
    batch?: { batchNumber: string; expiryDate?: string; medicine?: { brandName: string } }
    quantity: number
    purchaseRate: number
    saleRate: number
    total: number
  }[]
  totalAmount: number
  amountPaid: number
  status: string
  notes?: string
  storeName?: string
  storeAddress?: string
  storePhone?: string
}

function PurchaseInvoice({ d }: { d: PurchaseInvoiceData }) {
  const store = d.storeName || 'AbyteMedix Pharmacy'
  const addr = d.storeAddress || ''
  const phone = d.storePhone || ''
  const balance = Number(d.totalAmount) - Number(d.amountPaid)

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', Arial, sans-serif", color: '#14181B', padding: '0', minHeight: '297mm', width: '210mm', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #0E2A47', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Oswald', Arial, sans-serif", fontSize: 22, fontWeight: 700, color: '#0E2A47', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{store}</div>
            {addr && <div style={{ fontSize: 12, color: '#6B7178', marginTop: 2 }}>{addr}</div>}
            {phone && <div style={{ fontSize: 12, color: '#6B7178' }}>Tel: {phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Oswald', Arial, sans-serif", fontSize: 18, fontWeight: 700, color: '#0E2A47', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Purchase Order</div>
            <div style={{ ...mono, fontSize: 13, fontWeight: 700, marginTop: 4 }}>#{d.invoiceNumber}</div>
            <div style={{ fontSize: 11, marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
              background: d.status === 'PAID' ? 'rgba(62,142,90,0.12)' : d.status === 'PARTIAL' ? 'rgba(201,138,30,0.14)' : 'rgba(14,42,71,0.10)',
              color: d.status === 'PAID' ? '#3E8E5A' : d.status === 'PARTIAL' ? '#C98A1E' : '#0E2A47',
            }}>{d.status}</div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, background: '#ECE8DB', borderRadius: 4, padding: '12px 14px' }}>
        <div>
          <div style={{ fontSize: 10, color: '#6B7178', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Supplier</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{d.supplier?.name}</div>
          {d.supplier?.phone && <div style={{ fontSize: 12, color: '#6B7178' }}>{d.supplier.phone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#6B7178', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Purchase Date</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(d.purchaseDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 24 }}>#</th>
            <th style={{ ...th }}>Medicine</th>
            <th style={{ ...th, width: 80 }}>Batch</th>
            <th style={{ ...th, width: 80 }}>Expiry</th>
            <th style={{ ...th, textAlign: 'center', width: 50 }}>Qty</th>
            <th style={{ ...th, textAlign: 'right', width: 90 }}>P.Rate</th>
            <th style={{ ...th, textAlign: 'right', width: 90 }}>S.Rate</th>
            <th style={{ ...th, textAlign: 'right', width: 100 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(d.items ?? []).map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F5F2E8' }}>
              <td style={{ ...td, color: '#6B7178' }}>{i + 1}</td>
              <td style={{ ...td, fontWeight: 600 }}>{item.medicine?.brandName ?? item.batch?.medicine?.brandName ?? '—'}</td>
              <td style={{ ...td, ...mono, fontSize: 11 }}>{item.batch?.batchNumber ?? '—'}</td>
              <td style={{ ...td, fontSize: 11, color: '#6B7178' }}>{item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) : '—'}</td>
              <td style={{ ...td, textAlign: 'center', ...mono }}>{item.quantity}</td>
              <td style={{ ...td, textAlign: 'right', ...mono }}>Rs. {Number(item.purchaseRate).toFixed(2)}</td>
              <td style={{ ...td, textAlign: 'right', ...mono }}>Rs. {Number(item.saleRate).toFixed(2)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700, ...mono }}>Rs. {Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0E2A47', paddingTop: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>TOTAL</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#E85D1F', ...mono }}>Rs. {Number(d.totalAmount).toFixed(2)}</span>
          </div>
          <Row label="Amount Paid" value={`Rs. ${Number(d.amountPaid).toFixed(2)}`} color="#3E8E5A" />
          {balance > 0 && <Row label="Balance Due" value={`Rs. ${balance.toFixed(2)}`} color="#C23B2E" />}
        </div>
      </div>

      {d.notes && (
        <div style={{ background: '#ECE8DB', borderRadius: 4, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#6B7178' }}>
          <span style={{ fontWeight: 700 }}>Notes: </span>{d.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px dashed #D3CDBA', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
        <div>
          <div style={{ fontSize: 11, color: '#6B7178' }}>Received by: ________________________</div>
          <div style={{ fontSize: 11, color: '#6B7178', marginTop: 20 }}>Signature & Stamp</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#6B7178' }}>Authorized by: ________________________</div>
          <div style={{ fontSize: 11, color: '#6B7178', marginTop: 20 }}>Signature & Stamp</div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color, mt }: { label: string; value: string; color?: string; mt?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: mt ?? 4 }}>
      <span style={{ color: '#6B7178' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? '#14181B', ...mono }}>{value}</span>
    </div>
  )
}

/* ─── Portal wrapper ─── */
interface Props {
  type: 'sale'
  data: SaleReceiptData
  onAfterPrint?: () => void
}
interface PurchaseProps {
  type: 'purchase'
  data: PurchaseInvoiceData
  onAfterPrint?: () => void
}

export default function PrintA4(props: Props | PurchaseProps) {
  const el = document.getElementById('print-root')

  useEffect(() => {
    const handler = () => { props.onAfterPrint?.() }
    window.addEventListener('afterprint', handler)
    return () => window.removeEventListener('afterprint', handler)
  }, [props.onAfterPrint])

  if (!el) return null

  const content = props.type === 'sale'
    ? <SaleInvoice d={props.data} />
    : <PurchaseInvoice d={props.data} />

  return createPortal(content, el)
}
