import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../api/client'
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  PackageOpen,
  Boxes,
  Users,
  Truck,
  BarChart3,
  Wallet,
  UserCog,
  Settings,
  ClipboardList,
  HardDrive,
  ShieldCheck,
  LogOut,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} />, roles: ['ADMIN', 'MANAGER'] },
  { to: '/pos', label: 'POS / Sales', icon: <ShoppingCart size={16} />, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/medicines', label: 'Medicines', icon: <Pill size={16} />, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
  { to: '/purchases', label: 'Purchases', icon: <PackageOpen size={16} />, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
  { to: '/inventory', label: 'Inventory', icon: <Boxes size={16} />, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
  { to: '/customers', label: 'Customers', icon: <Users size={16} />, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/suppliers', label: 'Suppliers', icon: <Truck size={16} />, roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={16} />, roles: ['ADMIN', 'MANAGER'] },
  { to: '/accounts', label: 'Accounts', icon: <Wallet size={16} />, roles: ['ADMIN'] },
  { to: '/users', label: 'Users', icon: <UserCog size={16} />, roles: ['ADMIN'] },
  { to: '/settings', label: 'Settings', icon: <Settings size={16} />, roles: ['ADMIN'] },
  { to: '/audit', label: 'Audit Logs', icon: <ClipboardList size={16} />, roles: ['ADMIN'] },
  { to: '/backup', label: 'Backup', icon: <HardDrive size={16} />, roles: ['ADMIN'] },
  { to: '/license', label: 'License', icon: <ShieldCheck size={16} />, roles: ['ADMIN'] },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    try { await api.post('/auth/logout', { refreshToken }) } catch {}
    logout()
    navigate('/login', { replace: true })
  }

  const visibleNav = NAV_ITEMS.filter((n) => user && n.roles.includes(user.role))

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <h1 className="text-white font-bold text-lg">AbyteMedix</h1>
          <p className="text-gray-400 text-xs mt-0.5">{user?.fullName}</p>
          <span className="text-xs text-blue-400 mt-0.5 block">{user?.role}</span>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 text-sm text-left border-t border-gray-700 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
