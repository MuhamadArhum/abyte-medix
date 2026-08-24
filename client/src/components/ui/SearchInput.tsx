import { useEffect, useState, type RefObject } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  debounce?: number
  inputRef?: RefObject<HTMLInputElement | null>
}

export default function SearchInput({ value, onChange, placeholder = 'Search…', debounce = 300, inputRef }: SearchInputProps) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])
  useEffect(() => {
    const t = setTimeout(() => onChange(local), debounce)
    return () => clearTimeout(t)
  }, [local, debounce, onChange])

  return (
    <div style={{ position: 'relative', width: 280 }}>
      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--steel)' }} />
      <input
        ref={inputRef}
        type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)',
          padding: '7px 12px 7px 32px', fontSize: 12.5, color: 'var(--ink)',
          outline: 'none', fontFamily: 'var(--font-sans)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--orange)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--rule)' }}
      />
    </div>
  )
}
