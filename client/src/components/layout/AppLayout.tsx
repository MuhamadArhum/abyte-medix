import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../api/client'
import {
  LayoutDashboard, ShoppingCart, Pill, PackageOpen, Boxes,
  Users, Truck, BarChart3, Wallet, UserCog, Settings,
  ClipboardList, HardDrive, ShieldCheck, LogOut, FileText, Receipt,
} from 'lucide-react'

interface NavItem { to: string; label: string; icon: React.ReactNode; roles: string[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/',          label: 'Dashboard',  icon: <LayoutDashboard size={14} />, roles: ['ADMIN','MANAGER'] },
  { to: '/pos',        label: 'Sales / POS',  icon: <ShoppingCart size={14} />, roles: ['ADMIN','MANAGER','CASHIER'] },
  { to: '/sales',      label: 'Sales History', icon: <Receipt size={14} />,      roles: ['ADMIN','MANAGER','CASHIER'] },
  { to: '/quotations', label: 'Quotations',  icon: <FileText size={14} />,     roles: ['ADMIN','MANAGER','CASHIER'] },
  { to: '/medicines', label: 'Medicines',  icon: <Pill size={14} />,            roles: ['ADMIN','MANAGER','INVENTORY_STAFF'] },
  { to: '/purchases', label: 'Purchases',  icon: <PackageOpen size={14} />,     roles: ['ADMIN','MANAGER','INVENTORY_STAFF'] },
  { to: '/inventory', label: 'Inventory',  icon: <Boxes size={14} />,           roles: ['ADMIN','MANAGER','INVENTORY_STAFF'] },
  { to: '/customers', label: 'Customers',  icon: <Users size={14} />,           roles: ['ADMIN','MANAGER','CASHIER'] },
  { to: '/suppliers', label: 'Suppliers',  icon: <Truck size={14} />,           roles: ['ADMIN','MANAGER'] },
  { to: '/reports',   label: 'Reports',    icon: <BarChart3 size={14} />,       roles: ['ADMIN','MANAGER'] },
  { to: '/accounts',  label: 'Accounts',   icon: <Wallet size={14} />,          roles: ['ADMIN'] },
  { to: '/users',     label: 'Users',      icon: <UserCog size={14} />,         roles: ['ADMIN'] },
  { to: '/settings',  label: 'Settings',   icon: <Settings size={14} />,        roles: ['ADMIN'] },
  { to: '/audit',     label: 'Audit Logs', icon: <ClipboardList size={14} />,   roles: ['ADMIN'] },
  { to: '/backup',    label: 'Backup',     icon: <HardDrive size={14} />,       roles: ['ADMIN'] },
  { to: '/license',   label: 'License',    icon: <ShieldCheck size={14} />,     roles: ['ADMIN'] },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    try { await api.post('/auth/logout', { refreshToken }) } catch { /* server logout failed — proceed with local logout */ }
    logout()
    navigate('/login', { replace: true })
  }

  const visibleNav = NAV_ITEMS.filter((n) => user && n.roles.includes(user.role))
  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--paper)', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', flexShrink: 0,
        background: 'var(--blueprint-deep)',
        padding: '0 0 12px', display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '18px 14px 16px',
          borderBottom: '1px solid rgba(201,205,209,0.12)',
        }}>
          <div style={{
            width: 28, height: 28, background: 'var(--orange)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Pill size={14} color="#fff" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 14,
              color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em',
              lineHeight: 1.1,
            }}>
              AbyteMedix
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--line-cyan)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2, opacity: 0.7,
            }}>
              Medical Store
            </div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--line-cyan)',
          opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '14px 14px 6px',
        }}>
          Navigation
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px' }}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                all: 'unset' as any,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px',
                borderLeft: isActive ? '3px solid var(--orange)' : '3px solid transparent',
                borderRadius: '0 var(--radius) var(--radius) 0',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                color: isActive ? '#fff' : 'rgba(201,205,209,0.55)',
                background: isActive ? 'rgba(217,164,65,0.12)' : 'transparent',
                transition: 'all 0.12s',
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                if (!el.style.background.includes('0.12')) {
                  el.style.background = 'rgba(201,205,209,0.06)'
                  el.style.color = 'rgba(201,205,209,0.85)'
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                if (!el.style.background.includes('0.12')) {
                  el.style.background = 'transparent'
                  el.style.color = 'rgba(201,205,209,0.55)'
                }
              }}
            >
              <span style={{ flexShrink: 0, opacity: 0.85 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(201,205,209,0.12)',
          paddingTop: 10, marginTop: 8, padding: '10px 8px 0',
        }}>
          <button
            onClick={handleLogout}
            style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', width: '100%', borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 400,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              color: 'rgba(201,205,209,0.4)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--red-risk)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(201,205,209,0.4)' }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5,
            color: 'rgba(201,205,209,0.3)',
            padding: '4px 10px 0',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {user?.fullName} · {user?.role}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          height: 50, borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 20px', flexShrink: 0,
          background: 'var(--paper-light)',
        }}>
          <div style={{
            width: 34, height: 34, background: 'var(--blueprint)',
            color: '#fff', fontFamily: 'var(--font-oswald)',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {initials}
          </div>
        </div>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--paper)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
