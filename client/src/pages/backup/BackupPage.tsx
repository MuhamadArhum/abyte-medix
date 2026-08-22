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
    <div>
      <div className="pg-header">
        <div>
          <div className="pg-title">Backup & Restore</div>
          <div className="pg-sub">Manage database backups and restore points</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(62,142,90,0.12)' }}>
              <HardDrive size={20} style={{ color: '#17B978' }} />
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
            className="btn btn-primary mt-4 w-full justify-center"
          >
            {createMutation.isPending ? (
              <><Spinner size="sm" /> Creating Backup...</>
            ) : (
              <><RefreshCw size={16} /> Create Backup</>
            )}
          </button>
        </div>

        {/* Backup History */}
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 card-divider" style={{ borderBottom: '1px solid var(--rule)' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Backup History</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  {['Filename', 'Size', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backupList.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No backups found</td></tr>
                ) : (
                  backupList.map((b) => (
                    <tr key={b.id}>
                      <td className="text-xs truncate max-w-xs">{b.filename}</td>
                      <td>{formatBytes(b.size ?? 0)}</td>
                      <td><Badge label={b.status ?? 'COMPLETE'} variant="green" /></td>
                      <td>{new Date(b.createdAt).toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => {
                            if (confirm('Restore from this backup? This will overwrite current data.')) {
                              restoreMutation.mutate(b.id)
                            }
                          }}
                          disabled={restoreMutation.isPending}
                          className="text-xs font-medium border px-2 py-1 rounded disabled:opacity-50"
                          style={{ color: '#93630F', borderColor: '#F5D99C', background: '#FDF2E1' }}
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
