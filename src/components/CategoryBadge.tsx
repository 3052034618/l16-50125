import type { PurchaseCategory } from '@/types';
import { CATEGORY_LABELS } from '@/utils/constants';
import {
  Briefcase,
  Monitor,
  Sofa,
  Megaphone,
  GraduationCap,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: PurchaseCategory;
}

const CATEGORY_CONFIG: Record<PurchaseCategory, { icon: typeof Briefcase; color: string }> = {
  office: {
    icon: Briefcase,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  it: {
    icon: Monitor,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  furniture: {
    icon: Sofa,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  marketing: {
    icon: Megaphone,
    color: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  training: {
    icon: GraduationCap,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  other: {
    icon: Package,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  },
};

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium',
        config.color
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {CATEGORY_LABELS[category]}
    </span>
  );
}
