import type { User } from '@/types';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  title?: string;
  user: User | null;
  onLogout: () => void;
}

export default function Header({ title, user, onLogout }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-slate-800">
        {title || '工作台'}
      </h1>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">
                {user.name}
              </div>
              <div className="text-xs text-slate-500">{user.department}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        >
          <LogOut className="h-4 w-4" />
          <span>退出</span>
        </button>
      </div>
    </header>
  );
}
