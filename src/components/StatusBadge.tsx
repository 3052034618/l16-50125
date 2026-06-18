import type { PurchaseStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: PurchaseStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        STATUS_COLORS[status],
        sizeClasses[size]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
