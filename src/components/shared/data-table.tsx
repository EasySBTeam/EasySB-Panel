/*
 * A small, dependency-free table.
 *
 * The panel's lists are short enough to sort, filter and paginate in the browser,
 * so this renders a header that toggles sorting and a body of caller-defined
 * cells, and leaves the state that feeds it to the page. One shared component
 * keeps every list consistent without pulling in a table engine.
 */

import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type SortDirection = 'asc' | 'desc'

export interface Sort {
  key: string
  direction: SortDirection
}

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** A comparable value for sorting; a column without one is not sortable. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  className?: string
  headerClassName?: string
}

/** Sort a copy of the rows by the active column, leaving the input untouched. */
export function sortRows<T>(rows: T[], columns: Column<T>[], sort: Sort | null): T[] {
  if (!sort) {
    return rows
  }
  const column = columns.find((c) => c.key === sort.key)
  if (!column?.sortValue) {
    return rows
  }
  const getValue = column.sortValue
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = getValue(a)
    const bv = getValue(b)
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * factor
    }
    return String(av).localeCompare(String(bv), 'zh-Hans-CN') * factor
  })
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function DataTable<T>({
  columns,
  rows,
  sort,
  onSortChange,
  getRowKey,
  onRowClick,
  loading = false,
  empty,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  sort?: Sort | null
  onSortChange?: (sort: Sort | null) => void
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  empty?: ReactNode
  className?: string
}) {
  const toggleSort = (column: Column<T>) => {
    if (!onSortChange || !column.sortValue) {
      return
    }
    if (!sort || sort.key !== column.key) {
      onSortChange({ key: column.key, direction: 'asc' })
      return
    }
    onSortChange(sort.direction === 'asc' ? { key: column.key, direction: 'desc' } : null)
  }

  if (!loading && rows.length === 0 && empty) {
    return <>{empty}</>
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => {
              const active = sort?.key === column.key
              return (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-10 whitespace-nowrap',
                    alignClass[column.align ?? 'left'],
                    column.sortValue && onSortChange && 'cursor-pointer select-none',
                    column.headerClassName,
                  )}
                  onClick={() => toggleSort(column)}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      column.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    {column.header}
                    {column.sortValue && onSortChange ? (
                      active ? (
                        sort?.direction === 'asc' ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null
                    ) : null}
                  </span>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 4 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(alignClass[column.align ?? 'left'], column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** A search box sized for a table toolbar. */
export function TableSearch({
  value,
  onChange,
  placeholder = '搜索',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8"
      />
    </div>
  )
}

/** A page control for a client-side list. Hidden when there is a single page. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>共 {total} 条</p>
    )
  }
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <p className="text-xs text-muted-foreground">
        第 {page} / {pages} 页 · 共 {total} 条
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="上一页"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="下一页"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
