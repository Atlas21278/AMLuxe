import { useState, useMemo } from 'react'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

interface TableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyMessage?: string
  selectable?: boolean
  selectedIds?: Set<string | number>
  onSelectOne?: (id: string | number) => void
  onSelectAll?: () => void
  className?: string
}

type SortDir = 'asc' | 'desc'

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = 'Aucune donnée',
  selectable,
  selectedIds,
  onSelectOne,
  onSelectAll,
  className = '',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), 'fr', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const allSelected = selectable && selectedIds && data.length > 0 && data.every((r) => selectedIds.has(rowKey(r)))

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {selectable && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={onSelectAll}
                  className="rounded border border-white/20 bg-white/5 accent-purple-500"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-white/70 transition-colors' : ''} ${col.headerClassName ?? ''}`}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {sortDir === 'asc'
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      }
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12 text-white/30 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => {
              const id = rowKey(row)
              const isSelected = selectedIds?.has(id)
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-white/5 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/3' : 'hover:bg-white/2'} ${isSelected ? 'bg-purple-500/5' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); onSelectOne?.(id) }}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => onSelectOne?.(id)}
                        className="rounded border border-white/20 bg-white/5 accent-purple-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
