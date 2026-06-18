import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  title: string;
  render?: (row: T, index: number) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T, index: number) => void;
  rowKey?: (row: T, index: number) => string;
}

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number) => {
    if (rowKey) return rowKey(row, index);
    const r = row as Record<string, unknown>;
    if (typeof r.id === 'string') return r.id;
    return String(index);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 text-sm font-semibold text-slate-600 whitespace-nowrap',
                  ALIGN_CLASSES[col.align || 'left']
                )}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-16">
                <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">加载中...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyText} />
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                className={cn(
                  'border-b border-slate-100 last:border-b-0 transition-colors',
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                  onRowClick && 'cursor-pointer hover:bg-blue-50'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-sm text-slate-700 whitespace-nowrap',
                      ALIGN_CLASSES[col.align || 'left']
                    )}
                  >
                    {col.render
                      ? col.render(row, index)
                      : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
