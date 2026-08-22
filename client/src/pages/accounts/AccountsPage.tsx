import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { api } from '../../api/client'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

type Tab = 'summary' | 'expenses' | 'income' | 'payments' | 'cash'

function SummaryCard({ label, value, sub, variant = 'default' }: {
  label: string; value: string; sub?: string; variant?: 'default' | 'green' | 'red'
}) {
  const cls = variant === 'green' ? 'text-green-600' : variant === 'red' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AccountsPage() {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 8) + '01'

  const [tab, setTab] = useState<Tab>('summary')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [cashDate, setCashDate] = useState(today)

  // Modals
  const [expOpen, setExpOpen] = useState(false)
  const [incOpen, setIncOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  // Expense form
  const [expForm, setExpForm] = useState({ category: '', description: '', amount: '', date: today })
  // Income form
  const [incForm, setIncForm] = useState({ category: '', description: '', amount: '', date: today })
  // Payment form
  const [payForm, setPayForm] = useState({ type: 'CUSTOMER', entityId: '', amount: '', method: 'CASH', notes: '' })

  const { data: summary } = useQuery({
    queryKey: ['accounts-summary', from, to],
    queryFn: () => api.get(`/accounts/summary?from=${from}&to=${to}`).then(r => r.data),
    enabled: tab === 'summary',
  })

  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/accounts/expenses').then(r => r.data),
    enabled: tab === 'expenses',
  })

  const { data: income, isLoading: incLoading } = useQuery({
    queryKey: ['income'],
    queryFn: () => api.get('/accounts/income').then(r => r.data),
    enabled: tab === 'income',
  })

  const { data: payments, isLoading: payLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/accounts/payments').then(r => r.data),
    enabled: tab === 'payments',
  })

  const { data: cashReport } = useQuery({
    queryKey: ['cash-report', cashDate],
    queryFn: () => api.get(`/accounts/cash-report?date=${cashDate}`).then(r => r.data),
    enabled: tab === 'cash',
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => api.get('/customers?limit=500').then(r => r.data),
    enabled: payOpen,
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers?limit=500').then(r => r.data),
    enabled: payOpen,
  })

  const expMutation = useMutation({
    mutationFn: (p: Record<string, unknown>) => api.post('/accounts/expenses', p).then(r => r.data),
    onSuccess: () => { toast.success('Expense added'); setExpOpen(false); qc.invalidateQueries({ queryKey: ['expenses'] }) },
    onError: () => toast.error('Failed to add expense'),
  })

  const incMutation = useMutation({
    mutationFn: (p: Record<string, unknown>) => api.post('/accounts/income', p).then(r => r.data),
    onSuccess: () => { toast.success('Income added'); setIncOpen(false); qc.invalidateQueries({ queryKey: ['income'] }) },
    onError: () => toast.error('Failed to add income'),
  })

  const payMutation = useMutation({
    mutationFn: (p: Record<string, unknown>) => api.post('/accounts/payments', p).then(r => r.data),
    onSuccess: () => { toast.success('Payment recorded'); setPayOpen(false); qc.invalidateQueries({ queryKey: ['payments'] }) },
    onError: () => toast.error('Failed to record payment'),
  })

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  const custList = customers?.data ?? customers ?? []
  const supList = suppliers?.data ?? suppliers ?? []

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Accounts</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {(['summary', 'expenses', 'income', 'payments', 'cash'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'cash' ? 'Cash Report' : t}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From:</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To:</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Sales" value={`Rs. ${Number(summary?.totalSales ?? 0).toLocaleString()}`} variant="green" />
            <SummaryCard label="Total Purchases" value={`Rs. ${Number(summary?.totalPurchases ?? 0).toLocaleString()}`} variant="red" />
            <SummaryCard label="Gross Profit" value={`Rs. ${Number(summary?.grossProfit ?? 0).toLocaleString()}`} variant="green" />
            <SummaryCard label="Net Profit" value={`Rs. ${Number(summary?.netProfit ?? 0).toLocaleString()}`} variant={Number(summary?.netProfit ?? 0) >= 0 ? 'green' : 'red'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">P&L Breakdown</h3>
              {summary ? (
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Sales Revenue', value: summary.totalSales, cls: 'text-green-600' },
                    { label: 'Cost of Goods', value: -(summary.totalPurchases ?? 0), cls: 'text-red-600' },
                    { label: 'Total Expenses', value: -(summary.totalExpenses ?? 0), cls: 'text-red-600' },
                    { label: 'Other Income', value: summary.totalIncome ?? 0, cls: 'text-green-600' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-gray-600">{item.label}</span>
                      <span className={`font-medium ${item.cls}`}>Rs. {Math.abs(Number(item.value)).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                    <span>Net Profit</span>
                    <span className={Number(summary.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      Rs. {Number(summary.netProfit ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : <p className="text-gray-400 text-sm">No data</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Quick Stats</h3>
              {summary ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Discounts Given</span><span>Rs. {Number(summary.totalDiscount ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Tax Collected</span><span>Rs. {Number(summary.totalTax ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Cash Received</span><span className="text-green-600">Rs. {Number(summary.cashIn ?? 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Cash Out</span><span className="text-red-600">Rs. {Number(summary.cashOut ?? 0).toLocaleString()}</span></div>
                </div>
              ) : <p className="text-gray-400 text-sm">No data</p>}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setExpOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Plus size={16} /> Add Expense
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            {expLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Category', 'Description', 'Amount'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(expenses?.data ?? expenses ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No expenses</td></tr>
                  ) : (
                    (expenses?.data ?? expenses ?? []).map((e: any) => (
                      <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{e.category}</span></td>
                        <td className="px-4 py-2.5 text-gray-600">{e.description}</td>
                        <td className="px-4 py-2.5 font-semibold text-red-600">Rs. {Number(e.amount).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Income Tab */}
      {tab === 'income' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setIncOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Plus size={16} /> Add Income
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            {incLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Category', 'Description', 'Amount'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(income?.data ?? income ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No income records</td></tr>
                  ) : (
                    (income?.data ?? income ?? []).map((e: any) => (
                      <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{e.category}</span></td>
                        <td className="px-4 py-2.5 text-gray-600">{e.description}</td>
                        <td className="px-4 py-2.5 font-semibold text-green-600">Rs. {Number(e.amount).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setPayOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Plus size={16} /> Record Payment
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            {payLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Type', 'Party', 'Method', 'Amount'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(payments?.data ?? payments ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payments</td></tr>
                  ) : (
                    (payments?.data ?? payments ?? []).map((p: any) => (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5">{new Date(p.date ?? p.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{p.type}</span></td>
                        <td className="px-4 py-2.5">{p.customer?.name ?? p.supplier?.name ?? '—'}</td>
                        <td className="px-4 py-2.5">{p.method}</td>
                        <td className="px-4 py-2.5 font-semibold">Rs. {Number(p.amount).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Cash Report Tab */}
      {tab === 'cash' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Date:</label>
            <input type="date" value={cashDate} onChange={e => setCashDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {cashReport ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Opening Cash" value={`Rs. ${Number(cashReport.openingBalance ?? 0).toLocaleString()}`} />
              <SummaryCard label="Cash In" value={`Rs. ${Number(cashReport.cashIn ?? 0).toLocaleString()}`} variant="green" />
              <SummaryCard label="Cash Out" value={`Rs. ${Number(cashReport.cashOut ?? 0).toLocaleString()}`} variant="red" />
              <SummaryCard label="Closing Cash" value={`Rs. ${Number(cashReport.closingBalance ?? 0).toLocaleString()}`} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 flex justify-center py-12">
              <p className="text-gray-400">No cash report available for this date</p>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={expOpen} onClose={() => setExpOpen(false)} title="Add Expense" size="sm"
        footer={
          <>
            <button onClick={() => setExpOpen(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => expMutation.mutate({ ...expForm, amount: parseFloat(expForm.amount) })}
              disabled={expMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {expMutation.isPending && <Spinner size="sm" />} Add
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input className={inputCls} value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Rent, Utilities..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input className={inputCls} value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.)</label>
              <input type="number" className={inputCls} value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className={inputCls} value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Income Modal */}
      <Modal isOpen={incOpen} onClose={() => setIncOpen(false)} title="Add Income" size="sm"
        footer={
          <>
            <button onClick={() => setIncOpen(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => incMutation.mutate({ ...incForm, amount: parseFloat(incForm.amount) })}
              disabled={incMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {incMutation.isPending && <Spinner size="sm" />} Add
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input className={inputCls} value={incForm.category} onChange={e => setIncForm(p => ({ ...p, category: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input className={inputCls} value={incForm.description} onChange={e => setIncForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.)</label>
              <input type="number" className={inputCls} value={incForm.amount} onChange={e => setIncForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className={inputCls} value={incForm.date} onChange={e => setIncForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" size="sm"
        footer={
          <>
            <button onClick={() => setPayOpen(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => payMutation.mutate({
                type: payForm.type,
                ...(payForm.type === 'CUSTOMER' ? { customerId: Number(payForm.entityId) } : { supplierId: Number(payForm.entityId) }),
                amount: parseFloat(payForm.amount),
                method: payForm.method,
                notes: payForm.notes || undefined,
              })}
              disabled={payMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {payMutation.isPending && <Spinner size="sm" />} Record
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select className={inputCls} value={payForm.type} onChange={e => setPayForm(p => ({ ...p, type: e.target.value, entityId: '' }))}>
              <option value="CUSTOMER">Customer Payment Received</option>
              <option value="SUPPLIER">Supplier Payment Made</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {payForm.type === 'CUSTOMER' ? 'Customer' : 'Supplier'}
            </label>
            <select className={inputCls} value={payForm.entityId} onChange={e => setPayForm(p => ({ ...p, entityId: e.target.value }))}>
              <option value="">Select...</option>
              {(payForm.type === 'CUSTOMER' ? custList : supList).map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.)</label>
              <input type="number" className={inputCls} value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
              <select className={inputCls} value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input className={inputCls} value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
