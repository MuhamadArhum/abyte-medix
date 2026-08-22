type Variant = 'ok' | 'warn' | 'danger' | 'neutral' | 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

const styles: Record<Variant, React.CSSProperties> = {
  ok:      { background: 'rgba(62,142,90,0.12)',   color: '#3E8E5A' },
  green:   { background: 'rgba(62,142,90,0.12)',   color: '#3E8E5A' },
  warn:    { background: 'rgba(201,138,30,0.14)',  color: '#C98A1E' },
  yellow:  { background: 'rgba(201,138,30,0.14)',  color: '#C98A1E' },
  orange:  { background: 'rgba(232,93,31,0.12)',   color: '#E85D1F' },
  danger:  { background: 'rgba(194,59,46,0.12)',   color: '#C23B2E' },
  red:     { background: 'rgba(194,59,46,0.12)',   color: '#C23B2E' },
  neutral: { background: 'rgba(107,113,120,0.10)', color: '#6B7178' },
  gray:    { background: 'rgba(107,113,120,0.10)', color: '#6B7178' },
  blue:    { background: 'rgba(14,42,71,0.10)',    color: '#0E2A47' },
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
