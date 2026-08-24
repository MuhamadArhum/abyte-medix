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

const card: React.CSSProperties = {
  background: 'var(--paper-light)', border: '1px solid var(--rule)',
  borderRadius: 'var(--radius)', padding: 24,
}
const labelSm: React.CSSProperties = { fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }
const valueSm: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>
        {/* Status Card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius)', background: 'rgba(62,142,90,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardDrive size={18} style={{ color: 'var(--green-ok)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Backup Status</div>
              <div style={labelSm}>Last backup info</div>
            </div>
          </div>

          {lastBackup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelSm}>Last Backup</div>
                <div style={valueSm}>{new Date(lastBackup.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div style={labelSm}>File</div>
                <div style={{ ...valueSm, fontSize: 11, wordBreak: 'break-all' }}>{lastBackup.filename}</div>
              </div>
              <div>
                <div style={labelSm}>Size</div>
                <div style={valueSm}>{formatBytes(lastBackup.size ?? 0)}</div>
              </div>
              <div>
                <div style={labelSm}>Status</div>
                <Badge label={lastBackup.status ?? 'COMPLETE'} variant="green" />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--steel)' }}>No backups found</div>
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
        <div className="card">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--rule)' }}>
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
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--steel)', fontSize: 13 }}>No backups found</td></tr>
                ) : (
                  backupList.map((b) => (
                    <tr key={b.id ?? b.filename}>
                      <td style={{ fontSize: 11, wordBreak: 'break-all', maxWidth: 240 }}>{b.filename}</td>
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
                          style={{
                            fontSize: 11, fontWeight: 600, border: '1px solid var(--rule)',
                            padding: '3px 10px', borderRadius: 'var(--radius)', cursor: 'pointer',
                            color: 'var(--amber-warn)', background: 'rgba(201,138,30,0.08)',
                            fontFamily: 'var(--font-mono)', opacity: restoreMutation.isPending ? 0.5 : 1,
                          }}
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
