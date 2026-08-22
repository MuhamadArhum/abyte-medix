import { useQuery } from '@tanstack/react-query'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { api } from '../../api/client'

interface Props {
  supplier: { id: number; name: string }
  onClose: () => void
}

export default function SupplierLedger({ supplier, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['supplier-ledger', supplier.id],
    queryFn: () => api.get(`/suppliers/${supplier.id}/ledger`).then(r => r.data),
  })

  const entries = data?.entries ?? data ?? []

  return (
    <Modal isOpen onClose={onClose} title={`Ledger — ${supplier.name}`} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div>
          {data?.summary && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--paper)', border: '1px solid var(--rule)' }}>
                <p className="text-xs" style={{ color: 'var(--steel)' }}>Total Purchases</p>
                <p className="font-bold" style={{ color: 'var(--ink)' }}>Rs. {Number(data.summary.totalPurchases ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: '#E4F5EC', border: '1px solid #DCEFE6' }}>
                <p className="text-xs" style={{ color: '#2F8F5F' }}>Total Paid</p>
                <p className="font-bold" style={{ color: '#2F8F5F' }}>Rs. {Number(data.summary.totalPaid ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: '#FBE7E2', border: '1px solid #F4C2B8' }}>
                <p className="text-xs" style={{ color: '#C1462F' }}>Payable</p>
                <p className="font-bold" style={{ color: '#C1462F' }}>Rs. {Number(data.summary.payable ?? 0).toLocaleString()}</p>
              </div>
            </div>
          )}
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
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--steel)' }}>No transactions</td></tr>
                ) : (
                  entries.map((e: any, i: number) => (
                    <tr key={i}>
                      <td>{new Date(e.date ?? e.createdAt).toLocaleDateString()}</td>
                      <td className="font-medium capitalize">{e.type}</td>
                      <td style={{ color: 'var(--steel)' }}>{e.reference ?? e.invoiceNumber ?? '—'}</td>
                      <td style={{ color: '#C1462F' }}>{e.debit ? `Rs. ${Number(e.debit).toFixed(2)}` : '—'}</td>
                      <td style={{ color: '#2F8F5F' }}>{e.credit ? `Rs. ${Number(e.credit).toFixed(2)}` : '—'}</td>
                      <td className="font-semibold">Rs. {Number(e.balance ?? e.runningBalance ?? 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
