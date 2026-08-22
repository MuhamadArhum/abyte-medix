import { useQuery } from '@tanstack/react-query'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { format, isPast, isWithinInterval, addDays } from 'date-fns'

interface Props {
  medicine: { id: number; brandName: string }
  onClose: () => void
}

export default function BatchListModal({ medicine, onClose }: Props) {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches', medicine.id],
    queryFn: () => import('../../api/client').then(m => m.api.get(`/inventory/batches/${medicine.id}`).then(r => r.data)),
  })

  const getBatchStatus = (expiryDate: string) => {
    const exp = new Date(expiryDate)
    if (isPast(exp)) return <Badge label="Expired" variant="red" />
    if (isWithinInterval(exp, { start: new Date(), end: addDays(new Date(), 90) }))
      return <Badge label="Near Expiry" variant="orange" />
    return <Badge label="OK" variant="green" />
  }

  return (
    <Modal isOpen onClose={onClose} title={`Batches — ${medicine.brandName}`} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Batch #', 'Expiry', 'Purchase Rate', 'Sale Rate', 'Stock', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 uppercase font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No batches found</td></tr>
              ) : (
                (batches ?? []).map((b: any) => (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{b.batchNumber}</td>
                    <td className="px-3 py-2">{b.expiryDate ? format(new Date(b.expiryDate), 'MMM yyyy') : '—'}</td>
                    <td className="px-3 py-2">Rs. {Number(b.purchaseRate).toFixed(2)}</td>
                    <td className="px-3 py-2">Rs. {Number(b.saleRate).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold">{b.currentQty}</td>
                    <td className="px-3 py-2">{b.expiryDate ? getBatchStatus(b.expiryDate) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
