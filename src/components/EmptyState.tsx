import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-6 rounded-full bg-slate-50 p-6">
        <Icon className="h-16 w-16 text-slate-300" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
