import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { api, getApiError } from '../../api/client'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

type Tab = 'summary' | 'expenses' | 'income' | 'payments' | 'cash'

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card card-p">
      <div style={{ fontSize: 10.5, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17, color: color ?? 'var(--ink)' }}>{value}</div>
    </div>
  )
}

function SimpleTable({ headers, rows, loading }: { headers: string[]; rows: React.ReactNode[][]; loading?: boolean }) {
  return (
    <div className="card">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--steel)' }}>No records</td></tr>
              ) : rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AccountsPage() {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [tab, setTab] = useState<Tab>('summary')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [cashDate, setCashDate] = useState(today)
  const [expOpen, setExpOpen] = useState(false)
  const [incOpen, setIncOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [expForm, setExpForm] = useState({ category: '', description: '', amount: '', date: today })
  const [incForm, setIncForm] = useState({ category: '', description: '', amount: '', date: today })
  const [payForm, setPayForm] = useState({ type: 'CUSTOMER_RECEIPT', entityId: '', amount: '', method: 'CASH', notes: '' })

  const { data: summary } = useQuery({ queryKey: ['accounts-summary', from, to], queryFn: () => api.get(`/accounts/summary?from=${from}&to=${to}`).then(r => r.data), enabled: tab === 'summary' })
  const { data: expenses, isLoading: expLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/accounts/expenses').then(r => r.data), enabled: tab === 'expenses' })
  const { data: income, isLoading: incLoading } = useQuery({ queryKey: ['income'], queryFn: () => api.get('/accounts/income').then(r => r.data), enabled: tab === 'income' })
  const { data: payments, isLoading: payLoading } = useQuery({ queryKey: ['payments'], queryFn: () => api.get('/accounts/payments').then(r => r.data), enabled: tab === 'payments' })
  const { data: cashReport } = useQuery({ queryKey: ['cash-report', cashDate], queryFn: () => api.get(`/accounts/cash-report?date=${cashDate}`).then(r => r.data), enabled: tab === 'cash' })
  const { data: customers } = useQuery({ queryKey: ['customers-list'], queryFn: () => api.get('/customers?limit=500').then(r => r.data), enabled: payOpen })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers-list'], queryFn: () => api.get('/suppliers?limit=500').then(r => r.data), enabled: payOpen })

  const expMutation = useMutation({ mutationFn: (p: any) => api.post('/accounts/expenses', p).then(r => r.data), onSuccess: () => { toast.success('Expense added'); setExpOpen(false); qc.invalidateQueries({ queryKey: ['expenses'] }) }, onError: (err) => toast.error(getApiError(err)) })
  const incMutation = useMutation({ mutationFn: (p: any) => api.post('/accounts/income', p).then(r => r.data), onSuccess: () => { toast.success('Income added'); setIncOpen(false); qc.invalidateQueries({ queryKey: ['income'] }) }, onError: (err) => toast.error(getApiError(err)) })
  const payMutation = useMutation({ mutationFn: (p: any) => api.post('/accounts/payments', p).then(r => r.data), onSuccess: () => { toast.success('Payment recorded'); setPayOpen(false); qc.invalidateQueries({ queryKey: ['payments'] }) }, onError: (err) => toast.error(getApiError(err)) })

  const custList = customers?.data ?? customers ?? []
  const supList = suppliers?.data ?? suppliers ?? []

  const TABS: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Summary' }, { key: 'expenses', label: 'Expenses' },
    { key: 'income', label: 'Income' }, { key: 'payments', label: 'Payments' }, { key: 'cash', label: 'Cash Report' },
  ]

  return (
    <div>
      <div className="pg-header">
        <div><div className="pg-title">Accounts</div><div className="pg-sub">Financial summary, expenses, income and payments</div></div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>From:</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="filter-date" />
            <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>To:</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="filter-date" />
          </div>
          <div className="grid-4">
            <KpiCard label="Total Sales" value={`Rs. ${Number(summary?.totalSales ?? 0).toLocaleString()}`} color="#2F8F5F" />
            <KpiCard label="Total Purchases" value={`Rs. ${Number(summary?.totalPurchases ?? 0).toLocaleString()}`} color="#C1462F" />
            <KpiCard label="Gross Profit" value={`Rs. ${Number(summary?.grossProfit ?? 0).toLocaleString()}`} color="#2F8F5F" />
            <KpiCard label="Net Profit" value={`Rs. ${Number(summary?.netProfit ?? 0).toLocaleString()}`} color={Number(summary?.netProfit ?? 0) >= 0 ? '#2F8F5F' : '#C1462F'} />
          </div>
          <div className="grid-2">
            <div className="card card-p">
              <div className="card-title">P&amp;L Breakdown</div>
              {summary ? [
                { label: 'Sales Revenue', val: summary.totalSales, c: '#2F8F5F' },
                { label: 'Cost of Goods', val: summary.totalPurchases, c: '#C1462F' },
                { label: 'Total Expenses', val: summary.totalExpenses, c: '#C1462F' },
                { label: 'Other Income', val: summary.totalIncome, c: '#2F8F5F' },
              ].map(r => (
                <div key={r.label} className="row-item">
                  <span className="row-label">{r.label}</span>
                  <span className="row-value mono" style={{ color: r.c }}>Rs. {Number(r.val ?? 0).toLocaleString()}</span>
                </div>
              )) : <p style={{ color: 'var(--steel)', fontSize: 13 }}>No data for this period</p>}
              {summary && <div className="row-item" style={{ borderTop: '2px solid var(--rule)', marginTop: 4 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Net Profit</span>
                <span className="mono" style={{ fontWeight: 700, color: Number(summary.netProfit) >= 0 ? '#2F8F5F' : '#C1462F' }}>Rs. {Number(summary.netProfit ?? 0).toLocaleString()}</span>
              </div>}
            </div>
            <div className="card card-p">
              <div className="card-title">Quick Stats</div>
              {summary ? [
                { label: 'Discounts Given', val: summary.totalDiscount, c: '' },
                { label: 'Tax Collected', val: summary.totalTax, c: '' },
                { label: 'Cash Received', val: summary.cashIn, c: '#2F8F5F' },
                { label: 'Cash Out', val: summary.cashOut, c: '#C1462F' },
              ].map(r => (
                <div key={r.label} className="row-item">
                  <span className="row-label">{r.label}</span>
                  <span className="row-value mono" style={{ color: r.c || 'var(--ink)' }}>Rs. {Number(r.val ?? 0).toLocaleString()}</span>
                </div>
              )) : <p style={{ color: 'var(--steel)', fontSize: 13 }}>No data</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setExpOpen(true)}><Plus size={15} /> Add Expense</button>
          </div>
          <SimpleTable loading={expLoading} headers={['Date', 'Category', 'Description', 'Amount']}
            rows={(expenses?.data ?? expenses ?? []).map((e: any) => [
              new Date(e.date).toLocaleDateString(),
              <span className="badge badge-danger">{e.category}</span>,
              <span style={{ color: 'var(--steel)' }}>{e.description}</span>,
              <span className="mono" style={{ fontWeight: 700, color: '#C1462F' }}>Rs. {Number(e.amount).toLocaleString()}</span>,
            ])} />
        </div>
      )}

      {tab === 'income' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setIncOpen(true)}><Plus size={15} /> Add Income</button>
          </div>
          <SimpleTable loading={incLoading} headers={['Date', 'Category', 'Description', 'Amount']}
            rows={(income?.data ?? income ?? []).map((e: any) => [
              new Date(e.date).toLocaleDateString(),
              <span className="badge badge-ok">{e.category}</span>,
              <span style={{ color: 'var(--steel)' }}>{e.description}</span>,
              <span className="mono" style={{ fontWeight: 700, color: '#2F8F5F' }}>Rs. {Number(e.amount).toLocaleString()}</span>,
            ])} />
        </div>
      )}

      {tab === 'payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => setPayOpen(true)}><Plus size={15} /> Record Payment</button>
          </div>
          <SimpleTable loading={payLoading} headers={['Date', 'Type', 'Party', 'Method', 'Amount']}
            rows={(payments?.data ?? payments ?? []).map((p: any) => [
              new Date(p.createdAt).toLocaleDateString(),
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: p.type === 'CUSTOMER_RECEIPT' ? '#E4F5EC' : '#FBE7E2', color: p.type === 'CUSTOMER_RECEIPT' ? '#2F8F5F' : '#C1462F' }}>{p.type === 'CUSTOMER_RECEIPT' ? 'Received' : 'Paid Out'}</span>,
              p.customer?.name ?? p.supplier?.name ?? '—',
              <span style={{ color: 'var(--steel)' }}>{p.method}</span>,
              <span className="mono" style={{ fontWeight: 700 }}>Rs. {Number(p.amount).toLocaleString()}</span>,
            ])} />
        </div>
      )}

      {tab === 'cash' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--steel)' }}>Date:</span>
            <input type="date" value={cashDate} onChange={e => setCashDate(e.target.value)} className="filter-date" />
          </div>
          {cashReport ? (
            <div className="grid-4">
              <KpiCard label="Opening Cash" value={`Rs. ${Number(cashReport.openingBalance ?? 0).toLocaleString()}`} />
              <KpiCard label="Cash In" value={`Rs. ${Number(cashReport.cashIn ?? 0).toLocaleString()}`} color="#2F8F5F" />
              <KpiCard label="Cash Out" value={`Rs. ${Number(cashReport.cashOut ?? 0).toLocaleString()}`} color="#C1462F" />
              <KpiCard label="Closing Cash" value={`Rs. ${Number(cashReport.closingBalance ?? 0).toLocaleString()}`} />
            </div>
          ) : <p style={{ color: 'var(--steel)', fontSize: 13 }}>No cash report for this date</p>}
        </div>
      )}

      {/* Expense Modal */}
      <Modal isOpen={expOpen} onClose={() => setExpOpen(false)} title="Add Expense" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setExpOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={expMutation.isPending} onClick={() => expMutation.mutate({ ...expForm, amount: parseFloat(expForm.amount) })}>{expMutation.isPending && <Spinner size="sm" />}Add</button></>}>
        <div className="field-group"><label className="field-label">Category</label><input className="field-input" value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))} placeholder="Rent, Utilities…" /></div>
        <div className="field-group"><label className="field-label">Description</label><input className="field-input" value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group"><label className="field-label">Amount (Rs.)</label><input type="number" className="field-input" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="field-group"><label className="field-label">Date</label><input type="date" className="field-input" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
      </Modal>

      {/* Income Modal */}
      <Modal isOpen={incOpen} onClose={() => setIncOpen(false)} title="Add Income" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setIncOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={incMutation.isPending} onClick={() => incMutation.mutate({ ...incForm, amount: parseFloat(incForm.amount) })}>{incMutation.isPending && <Spinner size="sm" />}Add</button></>}>
        <div className="field-group"><label className="field-label">Category</label><input className="field-input" value={incForm.category} onChange={e => setIncForm(p => ({ ...p, category: e.target.value }))} /></div>
        <div className="field-group"><label className="field-label">Description</label><input className="field-input" value={incForm.description} onChange={e => setIncForm(p => ({ ...p, description: e.target.value }))} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group"><label className="field-label">Amount (Rs.)</label><input type="number" className="field-input" value={incForm.amount} onChange={e => setIncForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="field-group"><label className="field-label">Date</label><input type="date" className="field-input" value={incForm.date} onChange={e => setIncForm(p => ({ ...p, date: e.target.value }))} /></div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={payOpen} onClose={() => setPayOpen(false)} title="Record Payment" size="sm"
        footer={<><button className="btn btn-secondary" onClick={() => setPayOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={payMutation.isPending} onClick={() => payMutation.mutate({ type: payForm.type, ...(payForm.type === 'CUSTOMER_RECEIPT' ? { customerId: +payForm.entityId } : { supplierId: +payForm.entityId }), amount: parseFloat(payForm.amount), method: payForm.method, notes: payForm.notes || undefined })}>{payMutation.isPending && <Spinner size="sm" />}Record</button></>}>
        <div className="field-group"><label className="field-label">Type</label><select className="field-select" value={payForm.type} onChange={e => setPayForm(p => ({ ...p, type: e.target.value, entityId: '' }))}><option value="CUSTOMER_RECEIPT">Customer Payment Received</option><option value="SUPPLIER_PAYMENT">Supplier Payment Made</option></select></div>
        <div className="field-group"><label className="field-label">{payForm.type === 'CUSTOMER_RECEIPT' ? 'Customer' : 'Supplier'}</label><select className="field-select" value={payForm.entityId} onChange={e => setPayForm(p => ({ ...p, entityId: e.target.value }))}><option value="">Select…</option>{(payForm.type === 'CUSTOMER_RECEIPT' ? custList : supList).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field-group"><label className="field-label">Amount (Rs.)</label><input type="number" className="field-input" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} /></div>
          <div className="field-group"><label className="field-label">Method</label><select className="field-select" value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}><option value="CASH">Cash</option><option value="BANK">Bank</option><option value="CHEQUE">Cheque</option></select></div>
        </div>
        <div className="field-group"><label className="field-label">Notes</label><input className="field-input" value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} /></div>
      </Modal>
    </div>
  )
}
