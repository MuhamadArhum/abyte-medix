import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Edit, Key, Shield, Trash2 } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import Table, { type Column } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
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
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [addForm, setAddForm] = useState({ username: '', fullName: '', password: '', role: 'CASHIER' })
  const [editForm, setEditForm] = useState({ fullName: '', role: 'CASHIER', isActive: true })
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('User deleted'); setDeleteUser(null); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (err) => { toast.error(getApiError(err)); setDeleteUser(null) },
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
      key: 'role', label: 'Role', render: r => {
        const roleColor: Record<string, { bg: string; color: string }> = {
          ADMIN: { bg: '#FBE7E2', color: '#C1462F' },
          MANAGER: { bg: 'rgba(217,164,65,0.15)', color: 'var(--orange)' },
          CASHIER: { bg: '#E4F5EC', color: '#2F8F5F' },
          INVENTORY_STAFF: { bg: '#EDE9FE', color: '#7C3AED' },
        }
        const c = roleColor[r.role] ?? { bg: 'var(--paper)', color: 'var(--steel)' }
        return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.color }}>{r.role}</span>
      }
    },
    {
      key: 'isActive', label: 'Status', render: r => (
        <Badge label={r.isActive ? 'Active' : 'Inactive'} variant={r.isActive ? 'green' : 'gray'} />
      )
    },
    {
      key: 'actions', label: 'Actions', render: r => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditUser(r); setEditForm({ fullName: r.fullName, role: r.role, isActive: r.isActive }) }}
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
          {r.role !== 'ADMIN' && (
            <button onClick={() => setDeleteUser(r)}
              className="icon-btn danger" title="Delete User">
              <Trash2 size={14} />
            </button>
          )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 2px' }}>
          <label style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, flex: 1 }}>Active</label>
          <button
            type="button"
            onClick={() => setEditForm(p => ({ ...p, isActive: !p.isActive }))}
            style={{
              width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative',
              background: editForm.isActive ? 'var(--green-ok)' : 'var(--steel)', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: editForm.isActive ? 20 : 3, width: 16, height: 16,
              borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: 12, color: editForm.isActive ? 'var(--green-ok)' : 'var(--steel)', minWidth: 48 }}>
            {editForm.isActive ? 'Active' : 'Inactive'}
          </span>
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

      <ConfirmDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
        title="Delete User"
        message={`Permanently delete "${deleteUser?.fullName}" (${deleteUser?.username})? This cannot be undone. Users with existing sales records cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />

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
