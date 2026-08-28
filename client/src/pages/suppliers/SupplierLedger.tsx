import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Printer } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { api, getApiError } from '../../api/client'
import { printLedger } from '../../components/ui/PrintLedger'

interface Props {
  supplier: { id: number; name: string; payableBalance?: string }
  onClose: () => void
}

export default function SupplierLedger({ supplier, onClose }: Props) {
  const qc = useQueryClient()
  const [payAmt, setPayAmt] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-ledger', supplier.id],
    queryFn: () => api.get(`/suppliers/${supplier.id}/ledger`).then(r => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (payload: { amount: number; method: string; reference?: string }) =>
      api.post(`/suppliers/${supplier.id}/payments`, payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Payment recorded')
      setPayOpen(false)
      setPayAmt('')
      setPayRef('')
      qc.invalidateQueries({ queryKey: ['supplier-ledger', supplier.id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // Backend returns { supplier, ledger, closingBalance }
  const allEntries: any[] = data?.ledger ?? []

  const entries = useMemo(() => {
    return allEntries.filter(e => {
      const d = new Date(e.date ?? e.createdAt)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [allEntries, dateFrom, dateTo])

  const closingBalance = entries.length > 0
    ? Number(entries[entries.length - 1]?.balance ?? 0)
    : (dateFrom || dateTo ? 0 : data?.closingBalance ?? 0)

  const totalPurchases = entries.filter(e => e.type === 'PURCHASE').reduce((s: number, e: any) => s + Number(e.credit), 0)
  const totalPaid      = entries.filter(e => e.type === 'PAYMENT' || e.type === 'PURCHASE_RETURN').reduce((s: number, e: any) => s + Number(e.debit), 0)

  const typeStyle = (type: string) => {
    if (type === 'PURCHASE') return { label: 'Purchase', color: 'var(--red-risk)' }
    if (type === 'PAYMENT') return { label: 'Payment', color: 'var(--green-ok)' }
    if (type === 'PURCHASE_RETURN') return { label: 'Return', color: '#7C3AED' }
    return { label: type, color: 'var(--steel)' }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Ledger — ${supplier.name}`} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-4">

          {/* Date filter + Print */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
            <span style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Period:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '5px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', background: '#fff' }} />
            <span style={{ fontSize: 12, color: 'var(--steel)' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '5px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', background: '#fff' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                style={{ fontSize: 11, color: 'var(--red-risk)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                × Clear
              </button>
            )}
            <button
              onClick={() => printLedger({
                partyType: 'Supplier',
                partyName: supplier.name,
                dateFrom, dateTo,
                openingBalance: 0,
                closingBalance,
                totalDebit: totalPaid,
                totalCredit: totalPurchases,
                entries: entries.map(e => ({
                  date: e.date ?? e.createdAt,
                  type: e.type,
                  reference: e.reference,
                  debit: e.debit,
                  credit: e.credit,
                  balance: e.balance,
                })),
                storeName: 'AbyteMedix Pharmacy',
                printedAt: new Date(),
              })}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--blueprint)', background: 'var(--blueprint)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              <Printer size={14} /> Print Ledger
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center', background: 'var(--paper)', border: '1px solid var(--rule)' }}>
              <div style={{ fontSize: 11, color: 'var(--steel)', marginBottom: 4 }}>Total Purchased</div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>Rs. {totalPurchases.toLocaleString()}</div>
            </div>
            <div style={{ borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center', background: '#E4F5EC', border: '1px solid #DCEFE6' }}>
              <div style={{ fontSize: 11, color: '#2F8F5F', marginBottom: 4 }}>Total Paid</div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14, color: '#2F8F5F' }}>Rs. {totalPaid.toLocaleString()}</div>
            </div>
            <div style={{ borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center', background: closingBalance > 0 ? '#FBE7E2' : '#E4F5EC', border: closingBalance > 0 ? '1px solid #F4C2B8' : '1px solid #DCEFE6' }}>
              <div style={{ fontSize: 11, color: closingBalance > 0 ? '#C1462F' : '#2F8F5F', marginBottom: 4 }}>Payable Balance</div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14, color: closingBalance > 0 ? '#C1462F' : '#2F8F5F' }}>Rs. {Number(closingBalance).toLocaleString()}</div>
            </div>
          </div>

          {/* Make Payment inline form */}
          {payOpen && (
            <div style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Record Payment to Supplier</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 11, color: 'var(--steel)', display: 'block', marginBottom: 4 }}>Amount (Rs.)</label>
                  <input
                    type="number"
                    min={1}
                    max={closingBalance}
                    step="0.01"
                    value={payAmt}
                    onChange={e => setPayAmt(e.target.value)}
                    placeholder={`Max ${Number(closingBalance).toLocaleString()}`}
                    autoFocus
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', fontSize: 13, fontFamily: 'var(--font-mono)' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && payAmt) payMutation.mutate({ amount: Number(payAmt), method: payMethod, reference: payRef || undefined })
                      if (e.key === 'Escape') { setPayOpen(false); setPayAmt(''); setPayRef('') }
                    }}
                  />
                </div>
                <div style={{ minWidth: 110 }}>
                  <label style={{ fontSize: 11, color: 'var(--steel)', display: 'block', marginBottom: 4 }}>Method</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="filter-select" style={{ width: '100%' }}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: 11, color: 'var(--steel)', display: 'block', marginBottom: 4 }}>Reference (optional)</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={e => setPayRef(e.target.value)}
                    placeholder="Cheque # / TxID..."
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => payMutation.mutate({ amount: Number(payAmt), method: payMethod, reference: payRef || undefined })}
                    disabled={!payAmt || payMutation.isPending}
                    style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '7px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {payMutation.isPending ? <Spinner size="sm" /> : null} Save
                  </button>
                  <button onClick={() => { setPayOpen(false); setPayAmt(''); setPayRef('') }} className="btn btn-secondary" style={{ padding: '7px 12px' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Ledger table */}
          <div className="overflow-x-auto card">
            <table className="tbl">
              <thead>
                <tr>
                  {['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--steel)' }}>No transactions yet</td></tr>
                ) : (
                  entries.map((e: any, i: number) => {
                    const { label, color } = typeStyle(e.type)
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--steel)', fontSize: 12 }}>{new Date(e.date ?? e.createdAt).toLocaleDateString()}</td>
                        <td><span style={{ fontWeight: 600, color }}>{label}</span></td>
                        <td style={{ color: 'var(--steel)', fontSize: 12 }}>{e.reference || '—'}</td>
                        <td style={{ color: 'var(--green-ok)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {e.debit ? `Rs. ${Number(e.debit).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ color: 'var(--red-risk)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {e.credit ? `Rs. ${Number(e.credit).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12, color: Number(e.balance) > 0 ? 'var(--red-risk)' : 'var(--ink)' }}>
                          Rs. {Number(e.balance ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {closingBalance > 0 && !payOpen && (
              <button
                onClick={() => setPayOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--orange)', background: 'rgba(217,164,65,0.08)', color: 'var(--orange)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                + Record Payment
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary" style={{ marginLeft: 'auto' }}>Close</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
