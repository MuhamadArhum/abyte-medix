import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { api } from '../../api/client'

interface Props {
  purchaseId: number
  onClose: () => void
}

export default function PurchaseDetailModal({ purchaseId, onClose }: Props) {
  const qc = useQueryClient()

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => api.get(`/purchases/${purchaseId}`).then(r => r.data),
  })

  const returnMutation = useMutation({
    mutationFn: () => api.post(`/purchases/${purchaseId}/return`).then(r => r.data),
    onSuccess: () => {
      toast.success('Purchase return recorded')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['purchase', purchaseId] })
    },
    onError: () => toast.error('Failed to process return'),
  })

  return (
    <Modal isOpen onClose={onClose} title="Purchase Details" size="xl">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : purchase ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase">Invoice #</p>
              <p className="font-semibold">{purchase.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Supplier</p>
              <p className="font-semibold">{purchase.supplier?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Date</p>
              <p className="font-semibold">{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Status</p>
              <Badge label={purchase.status} variant={purchase.status === 'PAID' ? 'green' : purchase.status === 'PARTIAL' ? 'yellow' : 'gray'} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Total</p>
              <p className="font-semibold">Rs. {Number(purchase.totalAmount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Paid</p>
              <p className="font-semibold">Rs. {Number(purchase.amountPaid).toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Medicine', 'Batch', 'Expiry', 'Qty', 'P.Rate', 'S.Rate', 'Total'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(purchase.items ?? []).map((item: any) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{item.medicine?.brandName ?? item.batch?.medicine?.brandName}</td>
                    <td className="px-3 py-2">{item.batch?.batchNumber}</td>
                    <td className="px-3 py-2">{item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">Rs. {Number(item.purchaseRate).toFixed(2)}</td>
                    <td className="px-3 py-2">Rs. {Number(item.saleRate).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold">Rs. {Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {purchase.notes && (
            <p className="text-sm text-gray-600"><span className="font-medium">Notes:</span> {purchase.notes}</p>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending || purchase.status === 'RETURNED'}
              className="border border-orange-300 text-orange-600 px-4 py-2 rounded-lg text-sm hover:bg-orange-50 disabled:opacity-50 flex items-center gap-2"
            >
              {returnMutation.isPending && <Spinner size="sm" />}
              Return Purchase
            </button>
            <button onClick={onClose} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Not found</p>
      )}
    </Modal>
  )
}
