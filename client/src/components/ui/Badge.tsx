type Variant = 'ok' | 'warn' | 'danger' | 'neutral' | 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

const styles: Record<Variant, React.CSSProperties> = {
  ok:      { background: 'rgba(62,142,90,0.12)',    color: '#3E8E5A' },
  green:   { background: 'rgba(62,142,90,0.12)',    color: '#3E8E5A' },
  warn:    { background: 'rgba(201,138,30,0.14)',   color: '#C98A1E' },
  yellow:  { background: 'rgba(201,138,30,0.14)',   color: '#C98A1E' },
  orange:  { background: 'rgba(217,164,65,0.12)',   color: '#D9A441' },
  danger:  { background: 'rgba(194,59,46,0.12)',    color: '#C23B2E' },
  red:     { background: 'rgba(194,59,46,0.12)',    color: '#C23B2E' },
  neutral: { background: 'rgba(117,121,125,0.10)',  color: '#75797D' },
  gray:    { background: 'rgba(117,121,125,0.10)',  color: '#75797D' },
  blue:    { background: 'rgba(43,47,51,0.10)',     color: '#2B2F33' },
}

export default function Badge({ label, variant = 'neutral' }: { label: string; variant?: Variant }) {
  return (
    <span style={{
      ...styles[variant],
      fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500,
      padding: '2px 9px', borderRadius: 10,
      display: 'inline-block', whiteSpace: 'nowrap',
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {label}
    </span>
  )
}
