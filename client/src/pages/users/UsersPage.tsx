import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, Key, Shield } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
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
  const [addForm, setAddForm] = useState({ username: '', fullName: '', password: '', role: 'CASHIER' })
  const [editForm, setEditForm] = useState({ fullName: '', role: 'CASHIER' })
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({})

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (p: Record<string, unknown>) => api.post('/users', p).then(r => r.data),
    onSuccess: () => { toast.success('User created'); setAddOpen(false); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err) => toast.error(getApiError(err)),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.patch(`/users/${id}`, payload).then(r => r.data),
    onSuccess: () => { toast.success('User updated'); setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err) => toast.error(getApiError(err)),
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }).then(r => r.data),
    onSuccess: () => { toast.success('Password reset'); setResetUser(null); setNewPwd('') },
    onError: (err) => toast.error(getApiError(err)),
  })

  const permMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: any[] }) =>
      api.post(`/users/${id}/permissions`, permissions).then(r => r.data),
    onSuccess: () => { toast.success('Permissions updated'); setPermUser(null); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err) => toast.error(getApiError(err)),
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
    { key: 'username', label: 'Username', render: r => <span className="mono" style={{ fontWeight: 600 }}>{r.username}</span> },
    { key: 'fullName', label: 'Full Name' },
    {
      key: 'role', label: 'Role', render: r => (
        <span className="badge badge-blue">{r.role}</span>
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
            className="icon-btn success" title="Edit">
            <Edit size={14} />
          </button>
          <button onClick={() => { setResetUser(r); setNewPwd('') }}
            className="icon-btn" title="Reset Password" style={{ color: 'var(--amber-warn)' }}>
            <Key size={14} />
          </button>
          <button onClick={() => openPermModal(r)}
            className="icon-btn" title="Permissions">
            <Shield size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="pg">
      <div className="pg-header">
        <div>
          <div className="pg-title">Users</div>
          <div className="pg-sub">{userList.length} system users</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setAddOpen(true); setAddForm({ username: '', fullName: '', password: '', role: 'CASHIER' }) }}
        >
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="card">
        <Table columns={columns} data={userList} loading={isLoading} />
      </div>

      {/* Add User */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add User" size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => addMutation.mutate(addForm)} disabled={addMutation.isPending}>
              {addMutation.isPending && <Spinner size="sm" />} Create User
            </button>
          </>
        }
      >
        <div className="field-group">
          <label className="field-label">Username</label>
          <input className="field-input" value={addForm.username} onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="field-label">Full Name</label>
          <input className="field-input" value={addForm.fullName} onChange={e => setAddForm(p => ({ ...p, fullName: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="field-label">Password</label>
          <input type="password" className="field-input" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="field-label">Role</label>
          <select className="field-select" value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Modal>

      {/* Edit User */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => editUser && editMutation.mutate({ id: editUser.id, payload: editForm })} disabled={editMutation.isPending}>
              {editMutation.isPending && <Spinner size="sm" />} Save
            </button>
          </>
        }
      >
        <div className="field-group">
          <label className="field-label">Full Name</label>
          <input className="field-input" value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="field-label">Role</label>
          <select className="field-select" value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Modal>

      {/* Reset Password */}
      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.username}`} size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setResetUser(null)}>Cancel</button>
            <button
              className="btn"
              style={{ background: 'var(--amber-warn)', color: '#fff' }}
              onClick={() => resetUser && resetMutation.mutate({ id: resetUser.id, password: newPwd })}
              disabled={resetMutation.isPending || !newPwd}
            >
              {resetMutation.isPending && <Spinner size="sm" />} Reset
            </button>
          </>
        }
      >
        <div className="field-group">
          <label className="field-label">New Password</label>
          <input type="password" className="field-input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 8 characters" />
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={!!permUser} onClose={() => setPermUser(null)} title={`Permissions — ${permUser?.fullName}`} size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPermUser(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={savePermissions} disabled={permMutation.isPending}>
              {permMutation.isPending && <Spinner size="sm" />} Save Permissions
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Module</th>
                {ACTIONS.map(a => <th key={a} style={{ textAlign: 'center' }}>{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod}>
                  <td style={{ fontWeight: 600 }}>{mod}</td>
                  {ACTIONS.map(act => (
                    <td key={act} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={perms[mod]?.[act] ?? false}
                        onChange={e => setPerms(prev => ({ ...prev, [mod]: { ...prev[mod], [act]: e.target.checked } }))}
                        style={{ width: 15, height: 15, accentColor: 'var(--orange)', cursor: 'pointer' }}
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
