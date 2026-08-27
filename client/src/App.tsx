import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from './store/auth.store'
import { ROUTE_ROLES, canRole } from './config/rbac'
import { api } from './api/client'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import POSPage from './pages/pos/POSPage'
import MedicinesPage from './pages/medicines/MedicinesPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import InventoryPage from './pages/inventory/InventoryPage'
import CustomersPage from './pages/customers/CustomersPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import ReportsPage from './pages/reports/ReportsPage'
import AccountsPage from './pages/accounts/AccountsPage'
import UsersPage from './pages/users/UsersPage'
import SettingsPage from './pages/settings/SettingsPage'
import AuditPage from './pages/audit/AuditPage'
import BackupPage from './pages/backup/BackupPage'
import LicensePage from './pages/license/LicensePage'
import QuotationsPage from './pages/quotations/QuotationsPage'
import SalesPage from './pages/sales/SalesPage'
import SetupPage from './pages/setup/SetupPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  const { data: licenseStatus } = useQuery({
    queryKey: ['license-status'],
    queryFn: () => api.get('/license/status').then(r => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const licenseInvalid = licenseStatus && licenseStatus.valid === false
  const isAdmin = user?.role === 'ADMIN'
  const onLicensePage = location.pathname === '/license'

  // Admin can always access /license page to fix it
  if (licenseInvalid && isAdmin && !onLicensePage) return <Navigate to="/license" replace />

  // Non-admin sees a blocked screen
  if (licenseInvalid && !isAdmin) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1B1E21', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>License Expired or Invalid</div>
        <div style={{ color: '#75797D', fontSize: 13 }}>Please contact your system administrator.</div>
      </div>
    )
  }

  return <>{children}</>
}

// Blocks URL-manipulation access — redirects to first allowed page for the role
function RoleRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const allowed = ROUTE_ROLES[path] ?? ['ADMIN']
  if (!canRole(user?.role, allowed)) {
    // Redirect to first page the role IS allowed on
    const fallback = Object.entries(ROUTE_ROLES).find(([, roles]) =>
      canRole(user?.role, roles)
    )?.[0] ?? '/login'
    return <Navigate to={fallback} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<RoleRoute path="/"><DashboardPage /></RoleRoute>} />
          <Route path="pos" element={<RoleRoute path="/pos"><POSPage /></RoleRoute>} />
          <Route path="quotations" element={<RoleRoute path="/quotations"><QuotationsPage /></RoleRoute>} />
          <Route path="sales" element={<RoleRoute path="/sales"><SalesPage /></RoleRoute>} />
          <Route path="medicines" element={<RoleRoute path="/medicines"><MedicinesPage /></RoleRoute>} />
          <Route path="purchases" element={<RoleRoute path="/purchases"><PurchasesPage /></RoleRoute>} />
          <Route path="inventory" element={<RoleRoute path="/inventory"><InventoryPage /></RoleRoute>} />
          <Route path="customers" element={<RoleRoute path="/customers"><CustomersPage /></RoleRoute>} />
          <Route path="suppliers" element={<RoleRoute path="/suppliers"><SuppliersPage /></RoleRoute>} />
          <Route path="reports" element={<RoleRoute path="/reports"><ReportsPage /></RoleRoute>} />
          <Route path="accounts" element={<RoleRoute path="/accounts"><AccountsPage /></RoleRoute>} />
          <Route path="users" element={<RoleRoute path="/users"><UsersPage /></RoleRoute>} />
          <Route path="settings" element={<RoleRoute path="/settings"><SettingsPage /></RoleRoute>} />
          <Route path="audit" element={<RoleRoute path="/audit"><AuditPage /></RoleRoute>} />
          <Route path="backup" element={<RoleRoute path="/backup"><BackupPage /></RoleRoute>} />
          <Route path="license" element={<RoleRoute path="/license"><LicensePage /></RoleRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
