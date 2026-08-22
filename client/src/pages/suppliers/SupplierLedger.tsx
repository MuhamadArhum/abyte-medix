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
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Total Purchases</p>
                <p className="font-bold text-gray-900">Rs. {Number(data.summary.totalPurchases ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Total Paid</p>
                <p className="font-bold text-green-700">Rs. {Number(data.summary.totalPaid ?? 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Payable</p>
                <p className="font-bold text-red-600">Rs. {Number(data.summary.payable ?? 0).toLocaleString()}</p>
              </div>
            </div>
          )}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions</td></tr>
                ) : (
                  entries.map((e: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">{new Date(e.date ?? e.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-medium capitalize">{e.type}</td>
                      <td className="px-3 py-2 text-gray-500">{e.reference ?? e.invoiceNumber ?? '—'}</td>
                      <td className="px-3 py-2 text-red-600">{e.debit ? `Rs. ${Number(e.debit).toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2 text-green-600">{e.credit ? `Rs. ${Number(e.credit).toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2 font-semibold">Rs. {Number(e.balance ?? e.runningBalance ?? 0).toFixed(2)}</td>
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
