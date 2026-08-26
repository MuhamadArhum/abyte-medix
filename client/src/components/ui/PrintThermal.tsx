import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { SaleReceiptData } from './PrintA4'

function ThermalContent({ d }: { d: SaleReceiptData }) {
  const store = d.storeName || 'AbyteMedix Pharmacy'
  const phone = d.storePhone || ''

  return (
    <>
      <style>{`
        @media print {
          @page { size: 58mm auto; margin: 3mm 2mm; }
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
        }
      `}</style>
      <div style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 11,
        width: '52mm',
        margin: '0 auto',
        color: '#000',
        lineHeight: 1.5,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 5 }}>
          <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>{store.toUpperCase()}</div>
          {phone && <div style={{ fontSize: 10 }}>Tel: {phone}</div>}
          <div style={{ fontSize: 10, marginTop: 1 }}>
            {d.date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
            {'  '}
            {d.date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', marginBottom: 4 }} />

        <div style={{ fontSize: 10, marginBottom: 2 }}>
          Invoice#: <strong>{d.invoiceNumber}</strong>
        </div>
        <div style={{ fontSize: 10, marginBottom: 4 }}>
          Customer: <strong>{d.customerName}</strong>
        </div>

        <div style={{ borderTop: '1px dashed #000', marginBottom: 4 }} />

        {d.lines.map((l, i) => {
          const rate = l.saleRate ?? (l.total / l.qty)
          return (
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 11, wordBreak: 'break-word' }}>{l.medicineName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span>{l.qty} x {Number(rate).toFixed(2)}</span>
                <span style={{ fontWeight: 700 }}>{Number(l.total).toFixed(2)}</span>
              </div>
            </div>
          )
        })}

        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

        <div style={{ fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span><span>{Number(d.subtotal).toFixed(2)}</span>
          </div>
          {d.discountAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount</span><span>-{Number(d.discountAmt).toFixed(2)}</span>
            </div>
          )}
          {d.taxAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax</span><span>{Number(d.taxAmt).toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontWeight: 900, fontSize: 13,
            borderTop: '1px solid #000', paddingTop: 3, marginTop: 3,
          }}>
            <span>TOTAL</span>
            <span>Rs.{Number(d.total).toFixed(2)}</span>
          </div>
          {d.paymentMethod === 'CASH' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cash</span><span>{Number(d.paid).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Change</span><span>{Number(d.change).toFixed(2)}</span>
              </div>
            </>
          )}
          {d.paymentMethod === 'CREDIT' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment</span><span>CREDIT / DUE</span>
            </div>
          )}
          {d.paymentMethod === 'CARD' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Payment</span><span>CARD</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        <div style={{ textAlign: 'center', fontSize: 10 }}>
          <div style={{ fontWeight: 900 }}>Thank you!</div>
          <div>Get well soon · {store}</div>
        </div>
      </div>
    </>
  )
}

interface Props {
  data: SaleReceiptData
  onAfterPrint?: () => void
}

export default function PrintThermal({ data, onAfterPrint }: Props) {
  const el = document.getElementById('print-root')

  useEffect(() => {
    const handler = () => { onAfterPrint?.() }
    window.addEventListener('afterprint', handler)
    return () => window.removeEventListener('afterprint', handler)
  }, [onAfterPrint])

  if (!el) return null
  return createPortal(<ThermalContent d={data} />, el)
}
