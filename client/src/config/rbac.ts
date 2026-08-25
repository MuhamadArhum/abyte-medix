// Role-Based Access Control — single source of truth

export type AppRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'INVENTORY_STAFF'

// Which roles can access which route
export const ROUTE_ROLES: Record<string, AppRole[]> = {
  '/':           ['ADMIN', 'MANAGER'],
  '/pos':        ['ADMIN', 'MANAGER', 'CASHIER'],
  '/quotations': ['ADMIN', 'MANAGER', 'CASHIER'],
  '/sales':      ['ADMIN', 'MANAGER', 'CASHIER'],
  '/medicines':  ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'],
  '/purchases':  ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'],
  '/inventory':  ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'],
  '/customers':  ['ADMIN', 'MANAGER', 'CASHIER'],
  '/suppliers':  ['ADMIN', 'MANAGER'],
  '/reports':    ['ADMIN', 'MANAGER'],
  '/accounts':   ['ADMIN'],
  '/users':      ['ADMIN'],
  '/settings':   ['ADMIN'],
  '/audit':      ['ADMIN'],
  '/backup':     ['ADMIN'],
  '/license':    ['ADMIN'],
}

// Fine-grained action permissions per module
export const ACTION_ROLES = {
  medicines: {
    add:        ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] as AppRole[],
    edit:       ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] as AppRole[],
    deactivate: ['ADMIN', 'MANAGER'] as AppRole[],
  },
  customers: {
    add:        ['ADMIN', 'MANAGER', 'CASHIER'] as AppRole[],
    edit:       ['ADMIN', 'MANAGER'] as AppRole[],
    deactivate: ['ADMIN', 'MANAGER'] as AppRole[],
  },
  suppliers: {
    add:    ['ADMIN', 'MANAGER'] as AppRole[],
    edit:   ['ADMIN', 'MANAGER'] as AppRole[],
    delete: ['ADMIN', 'MANAGER'] as AppRole[],
  },
  quotations: {
    delete: ['ADMIN', 'MANAGER'] as AppRole[],
    load:   ['ADMIN', 'MANAGER', 'CASHIER'] as AppRole[],
  },
  purchases: {
    add: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] as AppRole[],
  },
  inventory: {
    adjust: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] as AppRole[],
  },
  users: {
    manage: ['ADMIN'] as AppRole[],
  },
  accounts: {
    manage: ['ADMIN'] as AppRole[],
  },
}

export function canRole(userRole: string | undefined, allowed: AppRole[]): boolean {
  if (!userRole) return false
  return allowed.includes(userRole as AppRole)
}
