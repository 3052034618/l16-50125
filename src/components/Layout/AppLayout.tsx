import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, init, initialized, logout } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  useEffect(() => {
    if (initialized && !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, initialized, navigate]);

  if (!initialized || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentPath={location.pathname}
        onNavigate={handleNavigate}
        userRole={currentUser.role}
        userName={currentUser.name}
        userDept={currentUser.department}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={pageTitle}
          user={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
