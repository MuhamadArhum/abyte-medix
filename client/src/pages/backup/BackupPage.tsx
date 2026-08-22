import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { HardDrive, RefreshCw } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

interface Backup {
  id: number
  filename: string
  size: number
  status: string
  createdAt: string
  path: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BackupPage() {
  const qc = useQueryClient()

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.get('/backup').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/backup').then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Backup created: ${data.filename ?? 'success'}`)
      qc.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: () => toast.error('Backup failed'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.post(`/backup/${id}/restore`).then(r => r.data),
    onSuccess: () => toast.success('Restore initiated. Application may restart.'),
    onError: () => toast.error('Restore failed'),
  })

  const backupList: Backup[] = backups?.data ?? backups ?? []
  const lastBackup = backupList[0]

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Backup & Restore</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <HardDrive size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Backup Status</h3>
              <p className="text-xs text-gray-400">Last backup info</p>
            </div>
          </div>

          {lastBackup ? (
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Last Backup</p>
                <p className="font-medium">{new Date(lastBackup.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">File</p>
                <p className="font-medium text-xs truncate">{lastBackup.filename}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Size</p>
                <p className="font-medium">{formatBytes(lastBackup.size ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <Badge label={lastBackup.status ?? 'COMPLETE'} variant="green" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No backups found</p>
          )}

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <><Spinner size="sm" /> Creating Backup...</>
            ) : (
              <><RefreshCw size={16} /> Create Backup</>
            )}
          </button>
        </div>

        {/* Backup History */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-700">Backup History</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Filename', 'Size', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backupList.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No backups found</td></tr>
                ) : (
                  backupList.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs truncate max-w-xs">{b.filename}</td>
                      <td className="px-4 py-3">{formatBytes(b.size ?? 0)}</td>
                      <td className="px-4 py-3"><Badge label={b.status ?? 'COMPLETE'} variant="green" /></td>
                      <td className="px-4 py-3">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (confirm('Restore from this backup? This will overwrite current data.')) {
                              restoreMutation.mutate(b.id)
                            }
                          }}
                          disabled={restoreMutation.isPending}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium border border-orange-200 px-2 py-1 rounded hover:bg-orange-50 disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
