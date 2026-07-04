import { ReactNode } from 'react'

export interface TableColumn<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  rowKey: keyof T
  emptyMessage?: string
}

export function Table<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No data',
}: TableProps<T>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-text-muted">
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-2 font-medium">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-6 text-center text-text-muted">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row) => (
            <tr key={String(row[rowKey])} className="border-b border-border last:border-0">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-text-primary">
                  {col.render
                    ? col.render(row)
                    : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
