import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Lock, Unlock, X } from 'lucide-react'
import { api } from '../../api/client'
import Spinner from '../../components/ui/Spinner'

interface ShiftData {
  id: number
  openedAt: string
  openingBalance: number
  status: string
  openedBy: { fullName: string }
  saleCount: number
  totalSales: number
  cashSales: number
  creditSales: number
  splitCash: number
}

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)' }
function fmtRs(n: number) { return 'Rs ' + Math.round(n || 0).toLocaleString('en-PK') }
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

export default function ShiftBanner({ onShiftChange }: { onShiftChange?: () => void }) {
  const qc = useQueryClient()
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [closeNotes, setCloseNotes] = useState('')

  const { data: shift, isLoading } = useQuery<ShiftData | null>({
    queryKey: ['shift-current'],
    queryFn: () => api.get('/shifts/current').then(r => r.data),
    refetchInterval: 30000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shift-current'] })
    onShiftChange?.()
  }

  const openMutation = useMutation({
    mutationFn: (openingBalance: number) => api.post('/shifts/open', { openingBalance }).then(r => r.data),
    onSuccess: () => {
      toast.success('Shift opened successfully')
      setShowOpenModal(false)
      setOpeningBalance('')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to open shift'),
  })

  const closeMutation = useMutation({
    mutationFn: ({ id, closingBalance, notes }: { id: number; closingBalance?: number; notes?: string }) =>
      api.post(`/shifts/${id}/close`, { closingBalance, notes }).then(r => r.data),
    onSuccess: () => {
      toast.success('Shift closed')
      setShowCloseModal(false)
      setClosingBalance('')
      setCloseNotes('')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to close shift'),
  })

  const inp: React.CSSProperties = {
    padding: '8px 11px', borderRadius: 8, border: '1px solid #D9D4C6',
    fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font-mono)',
  }

  if (isLoading) return null

  return (
    <>
      {/* ── Banner ── */}
      {shift ? (
        // Shift is OPEN — show summary bar
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '7px 16px', background: 'rgba(217,164,65,0.10)',
          borderBottom: '1px solid rgba(217,164,65,0.25)', flexShrink: 0,
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3E8E5A' }} />
            <span style={{ fontWeight: 700, color: '#17181A' }}>Shift OPEN</span>
            <span style={{ color: '#75797D' }}>since {fmtTime(shift.openedAt)}</span>
            <span style={{ color: '#75797D' }}>· {shift.openedBy.fullName}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => { setClosingBalance(''); setShowCloseModal(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 7, border: '1px solid #C23B2E',
                background: 'rgba(194,59,46,0.08)', color: '#C23B2E',
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
              }}
            >
              <Lock size={11} /> Close Shift
            </button>
          </div>
        </div>
      ) : (
        // No shift open
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: 'rgba(194,59,46,0.07)',
          borderBottom: '1px solid rgba(194,59,46,0.20)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Clock size={14} color="#C23B2E" />
            <span style={{ fontWeight: 700, color: '#C23B2E' }}>No Active Shift</span>
            <span style={{ color: '#75797D' }}>— Open a shift to start taking sales</span>
          </div>
          <button
            onClick={() => setShowOpenModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 7, border: 'none',
              background: '#D9A441', color: '#fff',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}
          >
            <Unlock size={12} /> Open Shift
          </button>
        </div>
      )}

      {/* ── Open Shift Modal ── */}
      {showOpenModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(27,30,33,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70,
        }} onClick={() => setShowOpenModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 380, padding: 28,
            boxShadow: '0 16px 48px rgba(27,30,33,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Open New Shift</div>
              <button onClick={() => setShowOpenModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#75797D' }}><X size={16} /></button>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#75797D', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Opening Cash Balance (Rs)
            </label>
            <input
              type="number"
              autoFocus
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && openMutation.mutate(parseFloat(openingBalance) || 0)}
              placeholder="0"
              style={inp}
            />
            <p style={{ fontSize: 11, color: '#75797D', marginTop: 6 }}>Cash in drawer at start of shift</p>
            <button
              onClick={() => openMutation.mutate(parseFloat(openingBalance) || 0)}
              disabled={openMutation.isPending}
              style={{
                width: '100%', marginTop: 16, padding: '11px', borderRadius: 9, border: 'none',
                background: '#D9A441', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {openMutation.isPending ? <Spinner size="sm" /> : <Unlock size={15} />}
              Open Shift
            </button>
          </div>
        </div>
      )}

      {/* ── Close Shift Modal ── */}
      {showCloseModal && shift && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(27,30,33,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70,
        }} onClick={() => setShowCloseModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 440, padding: 28,
            boxShadow: '0 16px 48px rgba(27,30,33,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Close Shift</div>
              <button onClick={() => setShowCloseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#75797D' }}><X size={16} /></button>
            </div>

            {/* Summary */}
            <div style={{ background: '#EDEAE2', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#75797D', textTransform: 'uppercase', marginBottom: 10 }}>Shift Summary</div>
              {[
                { label: 'Opened At', value: new Date(shift.openedAt).toLocaleString('en-PK') },
                { label: 'Opening Balance', value: fmtRs(Number(shift.openingBalance)) },
                { label: 'Total Sales', value: `${shift.saleCount} invoices` },
                { label: 'Cash Sales', value: fmtRs(shift.cashSales), color: '#3E8E5A' },
                { label: 'Split (Cash)', value: fmtRs(shift.splitCash ?? 0), color: '#7C3AED' },
                { label: 'Credit Sales', value: fmtRs(shift.creditSales), color: '#C23B2E' },
                { label: 'Total Revenue', value: fmtRs(shift.totalSales), color: '#D9A441', bold: true },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                  <span style={{ color: '#75797D' }}>{row.label}</span>
                  <span style={{ fontWeight: row.bold ? 800 : 600, color: row.color ?? '#17181A', ...MONO }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Variance Section */}
            {(() => {
              const expectedCash = Number(shift.openingBalance) + shift.cashSales + (shift.splitCash ?? 0)
              const actualCash = parseFloat(closingBalance) || 0
              const variance = closingBalance !== '' ? actualCash - expectedCash : null
              const varColor = variance === null ? '#75797D' : variance === 0 ? '#3E8E5A' : variance > 0 ? '#C98A1E' : '#C23B2E'
              const varLabel = variance === null ? '—' : variance === 0 ? 'Balanced ✓' : variance > 0 ? `+${fmtRs(variance)} (Over)` : `${fmtRs(variance)} (Short)`

              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#75797D', marginBottom: 6 }}>
                    <span>Expected Cash in Drawer</span>
                    <span style={{ fontWeight: 700, ...MONO, color: '#17181A' }}>{fmtRs(expectedCash)}</span>
                  </div>

                  <label style={{ fontSize: 11, fontWeight: 700, color: '#75797D', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                    Actual Cash Counted (Rs)
                  </label>
                  <input
                    type="number"
                    autoFocus
                    value={closingBalance}
                    onChange={e => setClosingBalance(e.target.value)}
                    placeholder="Count cash in drawer and enter here"
                    style={inp}
                  />

                  {closingBalance !== '' && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px', borderRadius: 9,
                      background: variance === 0 ? 'rgba(62,142,90,0.10)' : variance !== null && variance > 0 ? 'rgba(201,138,30,0.12)' : 'rgba(194,59,46,0.10)',
                      border: `1px solid ${varColor}22`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: varColor }}>Variance</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: varColor, ...MONO }}>{varLabel}</span>
                    </div>
                  )}
                </div>
              )
            })()}

            <label style={{ fontSize: 11, fontWeight: 700, color: '#75797D', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Notes {closingBalance !== '' && parseFloat(closingBalance) !== (Number(shift.openingBalance) + shift.cashSales + (shift.splitCash ?? 0)) ? '(explain variance)' : '(optional)'}
            </label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              placeholder="Any notes about this shift..."
              rows={2}
              style={{ ...inp, resize: 'none', fontFamily: 'var(--font-sans)' }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowCloseModal(false)} style={{
                flex: 1, padding: '10px', borderRadius: 9, border: '1px solid #D9D4C6',
                background: '#fff', color: '#75797D', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button
                onClick={() => closeMutation.mutate({
                  id: shift.id,
                  closingBalance: closingBalance ? parseFloat(closingBalance) : undefined,
                  notes: closeNotes || undefined,
                })}
                disabled={closeMutation.isPending}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                  background: '#C23B2E', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                {closeMutation.isPending ? <Spinner size="sm" /> : <Lock size={14} />}
                Close Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
