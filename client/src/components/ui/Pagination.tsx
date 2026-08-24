import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

const PAGE_SIZES = [10, 20, 50, 100]

export default function Pagination({ page, total, limit, onChange, onLimitChange }: PaginationProps) {
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const totalPages = Math.ceil(total / limit)

  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  const btnBase: React.CSSProperties = {
    border: '1px solid var(--rule)', borderRadius: 'var(--radius)', background: 'var(--paper-light)',
    cursor: 'pointer', color: 'var(--steel)', fontFamily: 'var(--font-mono)', fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const handleLimitChange = (val: string) => {
    if (val === 'custom') { setShowCustom(true); return }
    setShowCustom(false)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0 && onLimitChange) { onLimitChange(n); onChange(1) }
  }

  const applyCustom = () => {
    const n = parseInt(customInput, 10)
    if (!isNaN(n) && n > 0 && onLimitChange) {
      onLimitChange(n); onChange(1); setShowCustom(false); setCustomInput('')
    }
  }

  if (total === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderTop: '1px solid var(--rule)', flexWrap: 'wrap', gap: 8,
      background: 'var(--paper-light)',
    }}>
      {/* Left: count + per-page selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {total === 0 ? 'No records' : `${from}–${to} of ${total.toLocaleString()}`}
        </span>

        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Per page:</span>
            <select
              value={PAGE_SIZES.includes(limit) ? limit : 'custom'}
              onChange={e => handleLimitChange(e.target.value)}
              style={{
                border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '3px 7px',
                fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink)', background: 'var(--paper-light)', cursor: 'pointer',
                outline: 'none',
              }}
            >
              {PAGE_SIZES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {showCustom && (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCustom()}
                  placeholder="e.g. 75"
                  autoFocus
                  style={{
                    border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '3px 7px',
                    fontFamily: 'var(--font-mono)', fontSize: 11.5, width: 70, outline: 'none',
                  }}
                />
                <button
                  onClick={applyCustom}
                  style={{
                    background: 'var(--orange)', color: '#fff', border: 'none',
                    borderRadius: 'var(--radius)', padding: '3px 10px',
                    fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <button
            onClick={() => onChange(1)} disabled={page <= 1}
            style={{ ...btnBase, padding: '4px 8px', fontSize: 11, opacity: page <= 1 ? 0.4 : 1 }}
          >
            «
          </button>
          <button
            onClick={() => onChange(page - 1)} disabled={page <= 1}
            style={{ ...btnBase, padding: '4px 7px', opacity: page <= 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={13} />
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p = i + 1
            if (totalPages > 7) {
              if (page <= 4) p = i + 1
              else if (page >= totalPages - 3) p = totalPages - 6 + i
              else p = page - 3 + i
            }
            return (
              <button key={p} onClick={() => onChange(p)} style={{
                ...btnBase, width: 28, height: 28,
                background: p === page ? 'var(--blueprint)' : 'var(--paper-light)',
                color: p === page ? '#fff' : 'var(--steel)',
                borderColor: p === page ? 'var(--blueprint)' : 'var(--rule)',
                fontWeight: p === page ? 700 : 400,
              }}>
                {p}
              </button>
            )
          })}

          <button
            onClick={() => onChange(page + 1)} disabled={page >= totalPages}
            style={{ ...btnBase, padding: '4px 7px', opacity: page >= totalPages ? 0.4 : 1 }}
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={() => onChange(totalPages)} disabled={page >= totalPages}
            style={{ ...btnBase, padding: '4px 8px', fontSize: 11, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            »
          </button>
        </div>
      )}
    </div>
  )
}
