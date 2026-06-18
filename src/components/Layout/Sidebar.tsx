import type { UserRole } from '@/types';
import { ROLE_LABELS } from '@/utils/constants';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  CheckSquare,
  ShoppingCart,
  Package,
  BarChart3,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole: UserRole;
  userName: string;
  userDept: string;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    path: '/dashboard',
    label: '工作台',
    icon: LayoutDashboard,
  },
  {
    path: '/purchase/list',
    label: '我的申请',
    icon: FileText,
  },
  {
    path: '/purchase/new',
    label: '新建申请',
    icon: FilePlus,
  },
  {
    path: '/approval',
    label: '审批中心',
    icon: CheckSquare,
    roles: ['manager', 'finance', 'director', 'admin'],
  },
  {
    path: '/procurement',
    label: '采购执行',
    icon: ShoppingCart,
    roles: ['buyer', 'admin'],
  },
  {
    path: '/receipt',
    label: '收货确认',
    icon: Package,
  },
  {
    path: '/statistics',
    label: '统计分析',
    icon: BarChart3,
    roles: ['manager', 'finance', 'director', 'admin'],
  },
];

export default function Sidebar({
  currentPath,
  onNavigate,
  userRole,
  userName,
  userDept,
}: SidebarProps) {
  const visibleItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside className="flex h-screen w-60 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">采购管理</div>
          <div className="text-xs text-slate-400">Procurement</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => onNavigate(item.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
            <span className="text-sm font-semibold">
              {userName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {userName}
            </div>
            <div className="flex items-center gap-1.5 truncate text-xs text-slate-400">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{userDept}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {ROLE_LABELS[userRole]}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
