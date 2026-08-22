export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 16 : size === 'lg' ? 40 : 24
  return (
    <div style={{
      width: s, height: s, border: '2px solid var(--rule)',
      borderTop: '2px solid var(--orange)', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}
