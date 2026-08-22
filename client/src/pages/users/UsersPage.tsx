import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, Key, Shield } from 'lucide-react'
import { api } from '../../api/client'
import Table, { Column } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

interface AppUser {
  id: number
  username: string
  fullName: string
  role: string
  isActive: boolean
  permissions: { module: string; action: string; granted: boolean }[]
}

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY_STAFF']
const MODULES = ['Sales', 'Purchase', 'Inventory', 'Medicines', 'Customers', 'Suppliers', 'Reports']
const ACTIONS = ['View', 'Create', 'Edit', 'Delete']

export default function UsersPage() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [resetUser, setResetUser] = useState<AppUser | null>(null)
  const [permUser, setPermUser] = useState<AppUser | null>(null)
  const [newPwd, setNewPwd] = useState('')

  // Add form
  const [addForm, setAddForm] = useState({ username: '', fullName: '', password: '', role: 'CASHIER' })
  // Edit form
  const [editForm, setEditForm] = useState({ fullName: '', role: 'CASHIER' })
  // Permissions state
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({})

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (p: Record<string, unknown>) => api.post('/users', p).then(r => r.data),
    onSuccess: () => { toast.success('User created'); setAddOpen(false); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.patch(`/users/${id}`, payload).then(r => r.data),
    onSuccess: () => { toast.success('User updated'); setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }).then(r => r.data),
    onSuccess: () => { toast.success('Password reset'); setResetUser(null); setNewPwd('') },
    onError: () => toast.error('Failed to reset password'),
  })

  const permMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: any[] }) =>
      api.post(`/users/${id}/permissions`, permissions).then(r => r.data),
    onSuccess: () => { toast.success('Permissions updated'); setPermUser(null); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Failed to update permissions'),
  })

  const openPermModal = (user: AppUser) => {
    setPermUser(user)
    const initial: Record<string, Record<string, boolean>> = {}
    MODULES.forEach(mod => {
      initial[mod] = {}
      ACTIONS.forEach(act => {
        const existing = (user.permissions ?? []).find(
          p => p.module.toLowerCase() === mod.toLowerCase() && p.action.toLowerCase() === act.toLowerCase()
        )
        initial[mod][act] = existing?.granted ?? false
      })
    })
    setPerms(initial)
  }

  const savePermissions = () => {
    if (!permUser) return
    const list = MODULES.flatMap(mod =>
      ACTIONS.map(act => ({ module: mod, action: act, granted: perms[mod]?.[act] ?? false }))
    )
    permMutation.mutate({ id: permUser.id, permissions: list })
  }

  const userList: AppUser[] = users?.data ?? users ?? []

  const columns: Column<AppUser>[] = [
    { key: 'username', label: 'Username' },
    { key: 'fullName', label: 'Full Name' },
    {
      key: 'role', label: 'Role', render: r => (
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{r.role}</span>
      )
    },
    {
      key: 'isActive', label: 'Status', render: r => (
        <Badge label={r.isActive ? 'Active' : 'Inactive'} variant={r.isActive ? 'green' : 'gray'} />
      )
    },
    {
      key: 'actions', label: 'Actions', render: r => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditUser(r); setEditForm({ fullName: r.fullName, role: r.role }) }}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Edit">
            <Edit size={14} />
          </button>
          <button onClick={() => { setResetUser(r); setNewPwd('') }}
            className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded" title="Reset Password">
            <Key size={14} />
          </button>
          <button onClick={() => openPermModal(r)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Permissions">
            <Shield size={14} />
          </button>
        </div>
      )
    },
  ]

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Users</h2>
        <button
          onClick={() => { setAddOpen(true); setAddForm({ username: '', fullName: '', password: '', role: 'CASHIER' }) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <Table columns={columns} data={userList} loading={isLoading} />
      </div>

      {/* Add User */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add User" size="sm"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => addMutation.mutate(addForm)} disabled={addMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {addMutation.isPending && <Spinner size="sm" />} Create User
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
            <input className={inputCls} value={addForm.username} onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input className={inputCls} value={addForm.fullName} onChange={e => setAddForm(p => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input type="password" className={inputCls} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select className={inputCls} value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit User */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="sm"
        footer={
          <>
            <button onClick={() => setEditUser(null)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => editUser && editMutation.mutate({ id: editUser.id, payload: editForm })} disabled={editMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {editMutation.isPending && <Spinner size="sm" />} Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input className={inputCls} value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select className={inputCls} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Reset Password */}
      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.username}`} size="sm"
        footer={
          <>
            <button onClick={() => setResetUser(null)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => resetUser && resetMutation.mutate({ id: resetUser.id, password: newPwd })}
              disabled={resetMutation.isPending || !newPwd}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
            >
              {resetMutation.isPending && <Spinner size="sm" />} Reset
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
          <input type="password" className={inputCls} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 8 characters" />
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={!!permUser} onClose={() => setPermUser(null)} title={`Permissions — ${permUser?.fullName}`} size="lg"
        footer={
          <>
            <button onClick={() => setPermUser(null)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={savePermissions} disabled={permMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {permMutation.isPending && <Spinner size="sm" />} Save Permissions
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase font-semibold">Module</th>
                {ACTIONS.map(a => (
                  <th key={a} className="px-3 py-2 text-center text-xs text-gray-500 uppercase font-semibold">{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-700">{mod}</td>
                  {ACTIONS.map(act => (
                    <td key={act} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={perms[mod]?.[act] ?? false}
                        onChange={e => setPerms(prev => ({
                          ...prev,
                          [mod]: { ...prev[mod], [act]: e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
