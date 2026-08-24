import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = { sm: 360, md: 520, lg: 720, xl: 960 }

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(27,30,33,0.60)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: 16,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper-light)', borderRadius: 'var(--radius)', width: '100%',
          maxWidth: sizeMap[size], maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          border: '1px solid var(--rule)',
          boxShadow: '0 8px 32px rgba(27,30,33,0.22)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--rule)', flexShrink: 0,
        }}>
          <h3 style={{
            fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 15,
            color: 'var(--blueprint)', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--steel)', padding: 4, borderRadius: 'var(--radius)',
            display: 'flex', alignItems: 'center',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--red-risk)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--steel)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--rule)',
            display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
