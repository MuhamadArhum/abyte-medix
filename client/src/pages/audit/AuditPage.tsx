import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import Table, { Column } from '../../components/ui/Table'
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
  const [userId, setUserId] = useState('')
  const [module, setModule] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, userId, module, from, to],
    queryFn: () =>
      api.get(`/audit?page=${page}&limit=25&userId=${userId}&module=${module}&from=${from}&to=${to}`)
        .then(r => r.data),
  })

  const logs: AuditLog[] = data?.data ?? data ?? []
  const total: number = data?.total ?? logs.length

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', label: 'Date/Time', render: r => new Date(r.createdAt).toLocaleString() },
    { key: 'user', label: 'User', render: r => r.user?.fullName ?? r.user?.username ?? '—' },
    {
      key: 'module', label: 'Module', render: r => (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r.module}</span>
      )
    },
    {
      key: 'action', label: 'Action', render: r => {
        const cls = r.action === 'DELETE' ? 'bg-red-100 text-red-700' : r.action === 'CREATE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{r.action}</span>
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

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Audit Logs</h2>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex gap-3 flex-wrap">
          <select
            value={userId}
            onChange={e => { setUserId(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Users</option>
            {userList.map((u: any) => <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>)}
          </select>

          <select
            value={module}
            onChange={e => { setModule(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {(userId || module || from || to) && (
            <button
              onClick={() => { setUserId(''); setModule(''); setFrom(''); setTo(''); setPage(1) }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear filters
            </button>
          )}
        </div>

        <Table columns={columns} data={logs} loading={isLoading} />
        <Pagination page={page} total={total} limit={25} onChange={setPage} />
      </div>
    </div>
  )
}
