import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import Table from '../../components/ui/Table'
import type { Column } from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'

interface AuditLog {
  id: number
  createdAt: string
  user: { fullName: string; username: string }
  module: string
  action: string
  recordId: string
  details: Record<string, unknown>
}

const MODULES = ['Sales', 'Purchase', 'Inventory', 'Medicines', 'Customers', 'Suppliers', 'Users', 'Settings']

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [userId, setUserId] = useState('')
  const [module, setModule] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, limit, userId, module, from, to],
    queryFn: () =>
      api.get(`/audit?page=${page}&limit=${limit}&userId=${userId}&module=${module}&from=${from}&to=${to}`)
        .then(r => r.data),
  })

  const logs: AuditLog[] = data?.data ?? data ?? []
  const total: number = data?.total ?? logs.length

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', label: 'Date/Time', render: r => new Date(r.createdAt).toLocaleString() },
    { key: 'user', label: 'User', render: r => r.user?.fullName ?? r.user?.username ?? '—' },
    {
      key: 'module', label: 'Module', render: r => (
        <span className="badge badge-blue">{r.module}</span>
      )
    },
    {
      key: 'action', label: 'Action', render: r => {
        const cls = r.action === 'DELETE' ? 'badge-danger' : r.action === 'CREATE' ? 'badge-ok' : 'badge-neutral'
        return <span className={`badge ${cls}`}>{r.action}</span>
      }
    },
    { key: 'recordId', label: 'Record ID', render: r => r.recordId ?? '—' },
    {
      key: 'details', label: 'Details', render: r => (
        <span className="text-xs text-gray-400 truncate max-w-xs block">
          {r.details ? JSON.stringify(r.details).slice(0, 80) + '...' : '—'}
        </span>
      )
    },
  ]

  const userList = users?.data ?? users ?? []

  const filterSel: React.CSSProperties = {
    background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
    padding: '7px 10px', fontSize: 12.5, color: 'var(--ink)', outline: 'none',
    fontFamily: 'var(--font-sans)',
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>Audit Logs</h1>
        <div style={{ fontSize: 12.5, color: 'var(--steel)', marginTop: 2 }}>Full activity trail for all system actions</div>
      </div>

      <div style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={userId} onChange={e => { setUserId(e.target.value); setPage(1) }} style={filterSel}>
            <option value="">All Users</option>
            {userList.map((u: any) => <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>)}
          </select>
          <select value={module} onChange={e => { setModule(e.target.value); setPage(1) }} style={filterSel}>
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} style={filterSel} />
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} style={filterSel} />
          {(userId || module || from || to) && (
            <button onClick={() => { setUserId(''); setModule(''); setFrom(''); setTo(''); setPage(1) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--steel)' }}>
              Clear filters
            </button>
          )}
        </div>

        <Table columns={columns} data={logs} loading={isLoading} />
        <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
      </div>
    </div>
  )
}
