import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { SaleReceiptData } from './PrintA4'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n).toFixed(2)

// Right-pad or left-pad to fixed width (character-count based alignment)
function row(left: string, right: string, width = 32) {
  const gap = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(gap) + right
}

const DIV_DASH  = '- '.repeat(16)           // dashed line  32 chars
const DIV_SOLID = '─'.repeat(32)            // solid line   32 chars

// ─── receipt content (pure text + minimal tables — NO flexbox) ────────────────
function ThermalContent({ d }: { d: SaleReceiptData }) {
  const store   = d.storeName   || 'AbyteMedix Pharmacy'
  const phone   = d.storePhone  || ''
  const address = d.storeAddress || ''

  const dateStr = d.date.toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const timeStr = d.date.toLocaleTimeString('en-PK', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const PRE: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize:   '9pt',
    lineHeight: '1.35',
    whiteSpace: 'pre',
    color:      '#000',
    margin:     0,
    padding:    0,
  }

  const CENTER: React.CSSProperties = { ...PRE, textAlign: 'center' }

  return (
    <>
      {/* ── Override global @page A4 with thermal size ── */}
      <style>{`
        @media print {
          @page {
            size: 58mm auto !important;
            margin: 2mm 3mm !important;
          }
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
          #thermal-wrap * { font-family: 'Courier New', Courier, monospace !important; }
        }
      `}</style>

      <div
        id="thermal-wrap"
        style={{
          width:       '52mm',
          margin:      '0 auto',
          padding:     0,
          background:  '#fff',
          color:       '#000',
        }}
      >
        {/* ── HEADER ── */}
        <pre style={{ ...CENTER, fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          {store.toUpperCase()}
        </pre>
        {address && (
          <pre style={{ ...CENTER, fontSize: '8pt' }}>{address}</pre>
        )}
        {phone && (
          <pre style={{ ...CENTER, fontSize: '8pt' }}>Tel: {phone}</pre>
        )}
        <pre style={{ ...CENTER, fontSize: '8pt' }}>
          {dateStr}{'  '}{timeStr}
        </pre>

        <pre style={PRE}>{DIV_DASH}</pre>

        {/* ── INVOICE & CUSTOMER ── */}
        <pre style={{ ...PRE, fontSize: '8.5pt' }}>
          {`Invoice: ${d.invoiceNumber}`}
        </pre>
        <pre style={{ ...PRE, fontSize: '8.5pt' }}>
          {`Customer: ${d.customerName || 'Walk-in'}`}
        </pre>

        <pre style={PRE}>{DIV_DASH}</pre>

        {/* ── ITEMS ── */}
        <pre style={{ ...PRE, fontWeight: 'bold', fontSize: '8pt' }}>
          {row('ITEM', 'AMT')}
        </pre>
        <pre style={PRE}>{DIV_SOLID}</pre>

        {d.lines.map((l, i) => {
          const rate   = l.saleRate ?? (l.qty > 0 ? l.total / l.qty : 0)
          const amount = `${fmt(l.total)}`
          // Truncate medicine name to fit
          const maxNameLen = 32 - amount.length - 1
          const name = l.medicineName.length > maxNameLen
            ? l.medicineName.slice(0, maxNameLen - 1) + '…'
            : l.medicineName

          return (
            <pre key={i} style={{ ...PRE, fontSize: '8.5pt' }}>
              {/* Name line — right-aligned amount */}
              {row(name, amount)}
              {/* Qty x Rate — indented */}
              {'  '}{l.qty} x {fmt(rate)}
            </pre>
          )
        })}

        <pre style={PRE}>{DIV_SOLID}</pre>

        {/* ── TOTALS ── */}
        <pre style={{ ...PRE, fontSize: '8.5pt' }}>
          {row('Subtotal', `Rs.${fmt(d.subtotal)}`)}
        </pre>
        {d.discountAmt > 0 && (
          <pre style={{ ...PRE, fontSize: '8.5pt' }}>
            {row('Discount', `-Rs.${fmt(d.discountAmt)}`)}
          </pre>
        )}
        {d.taxAmt > 0 && (
          <pre style={{ ...PRE, fontSize: '8.5pt' }}>
            {row('Tax', `Rs.${fmt(d.taxAmt)}`)}
          </pre>
        )}

        <pre style={PRE}>{DIV_SOLID}</pre>

        <pre style={{ ...PRE, fontSize: '11pt', fontWeight: 'bold' }}>
          {row('TOTAL', `Rs.${fmt(d.total)}`)}
        </pre>

        <pre style={PRE}>{DIV_DASH}</pre>

        {/* ── PAYMENT ── */}
        {d.paymentMethod === 'CASH' && (
          <>
            <pre style={{ ...PRE, fontSize: '8.5pt' }}>
              {row('Cash Paid', `Rs.${fmt(d.paid)}`)}
            </pre>
            <pre style={{ ...PRE, fontSize: '8.5pt' }}>
              {row('Change', `Rs.${fmt(d.change)}`)}
            </pre>
          </>
        )}
        {d.paymentMethod === 'CARD' && (
          <pre style={{ ...PRE, fontSize: '8.5pt' }}>
            {row('Payment', 'CARD')}
          </pre>
        )}
        {d.paymentMethod === 'CREDIT' && (
          <pre style={{ ...PRE, fontSize: '8.5pt' }}>
            {row('Payment', 'CREDIT / DUE')}
          </pre>
        )}
        {d.paymentMethod === 'SPLIT' && (
          <>
            <pre style={{ ...PRE, fontSize: '8.5pt' }}>
              {row('Cash Paid', `Rs.${fmt(d.paid)}`)}
            </pre>
            <pre style={{ ...PRE, fontSize: '8.5pt' }}>
              {row('Payment', 'SPLIT')}
            </pre>
          </>
        )}

        <pre style={PRE}>{DIV_DASH}</pre>

        {/* ── FOOTER ── */}
        <pre style={{ ...CENTER, fontWeight: 'bold', fontSize: '9pt' }}>
          ** Thank You! **
        </pre>
        <pre style={{ ...CENTER, fontSize: '8pt' }}>
          Get well soon
        </pre>
        <pre style={{ ...CENTER, fontSize: '8pt' }}>
          {store}
        </pre>
        <pre style={PRE}>{'\n'}</pre>
      </div>
    </>
  )
}

// ─── portal wrapper ────────────────────────────────────────────────────────────
interface Props {
  data: SaleReceiptData
  onAfterPrint?: () => void
}

export default function PrintThermal({ data, onAfterPrint }: Props) {
  const el = document.getElementById('print-root')

  useEffect(() => {
    const handler = () => onAfterPrint?.()
    window.addEventListener('afterprint', handler)
    return () => window.removeEventListener('afterprint', handler)
  }, [onAfterPrint])

  if (!el) return null
  return createPortal(<ThermalContent d={data} />, el)
}
