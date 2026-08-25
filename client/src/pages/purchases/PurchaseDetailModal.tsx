import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Printer, CreditCard } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { api, getApiError } from '../../api/client'
import PrintA4 from '../../components/ui/PrintA4'

interface Props {
  purchaseId: number
  onClose: () => void
}

export default function PurchaseDetailModal({ purchaseId, onClose }: Props) {
  const qc = useQueryClient()
  const [printing, setPrinting] = useState(false)
  const [paymentAmt, setPaymentAmt] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F7') {
        e.preventDefault()
        setPrinting(true)
        setTimeout(() => window.print(), 120)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => api.get(`/purchases/${purchaseId}`).then(r => r.data),
  })

  const paymentMutation = useMutation({
    mutationFn: (amount: number) => api.patch(`/purchases/${purchaseId}/payment`, { amount }).then(r => r.data),
    onSuccess: () => {
      toast.success('Payment recorded')
      setPaymentOpen(false)
      setPaymentAmt('')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchase', purchaseId] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const returnMutation = useMutation({
    mutationFn: () => api.post(`/purchases/${purchaseId}/return`, {
      reason: 'Full purchase return',
      items: (purchase?.items ?? []).map((i: any) => ({
        batchId: i.batchId,
        quantity: i.quantity,
        amount: Number(i.total),
      })),
      totalAmount: Number(purchase?.total ?? 0),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Purchase return recorded')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchase', purchaseId] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <Modal isOpen onClose={onClose} title="Purchase Details" size="xl">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : purchase ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="field-label" style={{ marginBottom: 2 }}>Invoice #</p>
              <p className="font-semibold">{purchase.invoiceNumber}</p>
            </div>
            <div>
              <p className="field-label" style={{ marginBottom: 2 }}>Supplier</p>
              <p className="font-semibold">{purchase.supplier?.name}</p>
            </div>
            <div>
              <p className="field-label" style={{ marginBottom: 2 }}>Date</p>
              <p className="font-semibold">{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="field-label" style={{ marginBottom: 2 }}>Status</p>
              <Badge label={purchase.status} variant={purchase.status === 'RECEIVED' ? 'green' : purchase.status === 'PARTIAL' ? 'warn' : 'neutral'} />
            </div>
            <div>
              <p className="field-label" style={{ marginBottom: 2 }}>Total</p>
              <p className="font-semibold">Rs. {Number(purchase.total).toLocaleString()}</p>
            </div>
            <div>
              <p className="field-label" style={{ marginBottom: 2 }}>Paid</p>
              <p className="font-semibold" style={{ color: 'var(--green-ok)' }}>Rs. {Number(purchase.amountPaid).toLocaleString()}</p>
            </div>
            {Number(purchase.total) - Number(purchase.amountPaid) > 0 && (
              <div>
                <p className="field-label" style={{ marginBottom: 2 }}>Balance Due</p>
                <p className="font-semibold" style={{ color: 'var(--red-risk)' }}>Rs. {(Number(purchase.total) - Number(purchase.amountPaid)).toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto card">
            <table className="tbl">
              <thead>
                <tr>
                  {['Medicine', 'Batch', 'Expiry', 'Qty', 'P.Rate', 'S.Rate', 'Total'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(purchase.items ?? []).map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.medicine?.brandName ?? item.batch?.medicine?.brandName}</td>
                    <td>{item.batch?.batchNumber}</td>
                    <td>{item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString() : '—'}</td>
                    <td>{item.quantity}</td>
                    <td>Rs. {Number(item.purchaseRate).toFixed(2)}</td>
                    <td>Rs. {Number(item.saleRate).toFixed(2)}</td>
                    <td className="font-semibold">Rs. {Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {purchase.notes && (
            <p className="text-sm" style={{ color: '#4C7565' }}><span className="font-medium">Notes:</span> {purchase.notes}</p>
          )}

          {/* Add Payment inline form */}
          {paymentOpen && (
            <div style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Payment Amount:</span>
              <input
                type="number"
                min={1}
                max={Number(purchase.total) - Number(purchase.amountPaid)}
                step="0.01"
                value={paymentAmt}
                onChange={e => setPaymentAmt(e.target.value)}
                placeholder={`Max Rs. ${(Number(purchase.total) - Number(purchase.amountPaid)).toLocaleString()}`}
                autoFocus
                style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', fontSize: 13, fontFamily: 'var(--font-mono)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && paymentAmt) paymentMutation.mutate(Number(paymentAmt))
                  if (e.key === 'Escape') { setPaymentOpen(false); setPaymentAmt('') }
                }}
              />
              <button
                onClick={() => paymentMutation.mutate(Number(paymentAmt))}
                disabled={!paymentAmt || paymentMutation.isPending}
                style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {paymentMutation.isPending ? <Spinner size="sm" /> : null} Save
              </button>
              <button onClick={() => { setPaymentOpen(false); setPaymentAmt('') }} className="btn btn-secondary" style={{ padding: '7px 12px' }}>Cancel</button>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div style={{ display: 'flex', gap: 8 }}>
              {purchase.status === 'PARTIAL' && !paymentOpen && (
                <button
                  onClick={() => setPaymentOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid #7C3AED', background: 'rgba(124,58,237,0.08)', color: '#7C3AED', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  <CreditCard size={14} /> Add Payment
                </button>
              )}
              <button
                onClick={() => returnMutation.mutate()}
                disabled={returnMutation.isPending || purchase.status === 'DRAFT'}
                className="btn disabled:opacity-50"
                style={{ background: '#FDF2E1', color: '#93630F', border: '1px solid #F5D99C' }}
              >
                {returnMutation.isPending && <Spinner size="sm" />}
                Return Purchase
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setPrinting(true); setTimeout(() => window.print(), 120) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: '#fff', color: 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                <Printer size={14} /> Print A4 <span style={{ fontSize: 10, opacity: 0.5, fontFamily: 'var(--font-mono)' }}>F7</span>
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Not found</p>
      )}

      {printing && purchase && (
        <PrintA4
          type="purchase"
          data={purchase}
          onAfterPrint={() => setPrinting(false)}
        />
      )}
    </Modal>
  )
}
