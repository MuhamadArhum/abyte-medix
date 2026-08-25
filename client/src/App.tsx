import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/auth.store'
import { ROUTE_ROLES, canRole } from './config/rbac'
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
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
