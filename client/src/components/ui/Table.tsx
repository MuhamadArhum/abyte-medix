import Spinner from './Spinner'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  keyField?: string
}

export default function Table<T extends object>({
  columns, data, loading, keyField = 'id',
}: TableProps<T>) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                textAlign: 'center', padding: '40px 10px',
                color: 'var(--steel)', fontSize: 13,
              }}>
                No data found
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={String((row as Record<string, unknown>)[keyField] ?? i)}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
