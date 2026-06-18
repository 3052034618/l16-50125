import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/constants';
import type { UserRole } from '@/types';
import {
  ShoppingCart,
  FileCheck2,
  Users,
  BarChart3,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface TestAccount {
  account: string;
  name: string;
  role: UserRole;
  department: string;
}

const testAccounts: TestAccount[] = [
  { account: 'employee01', name: '张三', role: 'employee', department: '技术部' },
  { account: 'employee02', name: '李四', role: 'employee', department: '市场部' },
  { account: 'manager01', name: '陈经理', role: 'manager', department: '技术部' },
  { account: 'finance01', name: '赵会计', role: 'finance', department: '财务部' },
  { account: 'director01', name: '孙总监', role: 'director', department: '采购部' },
  { account: 'buyer01', name: '周采购', role: 'buyer', department: '采购部' },
  { account: 'admin01', name: '系统管理员', role: 'admin', department: '行政部' },
];

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed right-6 top-6 z-50 animate-[slideIn_0.3s_ease-out]">
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
          type === 'success'
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, init, initialized, currentUser } = useAuthStore();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  useEffect(() => {
    if (initialized && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, initialized, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password) {
      setToast({ message: '请输入账号和密码', type: 'error' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = login(account.trim(), password);
      setLoading(false);
      if (result.success) {
        setToast({ message: '登录成功', type: 'success' });
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } else {
        setToast({ message: result.message || '登录失败', type: 'error' });
      }
    }, 400);
  };

  const handleQuickLogin = (acc: string) => {
    setAccount(acc);
    setPassword('123456');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="flex min-h-screen">
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 p-12 lg:flex">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-20 top-40 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <ShoppingCart className="h-7 w-7 text-white" />
              </div>
              <div className="text-white">
                <div className="text-lg font-bold">ProcurementMS</div>
                <div className="text-xs text-blue-200/70">v1.0.0</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-white">
                企业采购
                <br />
                管理系统
              </h1>
              <p className="mt-3 text-lg text-blue-200/80">
                Procurement Management System
              </p>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-blue-200/70">
              一站式采购流程管理平台，覆盖申请、审批、下单、收货全流程，助力企业数字化采购转型。
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur transition-colors hover:bg-white/10">
                <FileCheck2 className="h-6 w-6 text-blue-300" />
                <div className="mt-2 text-sm font-medium text-white">多级审批</div>
                <div className="mt-1 text-xs text-blue-200/60">自动化工作流</div>
              </div>
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur transition-colors hover:bg-white/10">
                <Users className="h-6 w-6 text-blue-300" />
                <div className="mt-2 text-sm font-medium text-white">角色协作</div>
                <div className="mt-1 text-xs text-blue-200/60">多角色权限</div>
              </div>
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur transition-colors hover:bg-white/10">
                <BarChart3 className="h-6 w-6 text-blue-300" />
                <div className="mt-2 text-sm font-medium text-white">数据分析</div>
                <div className="mt-1 text-xs text-blue-200/60">可视化报表</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-xs text-blue-200/50">
            © 2026 企业采购管理系统. All rights reserved.
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-slate-50 p-6 lg:w-1/2 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">
                    企业采购管理系统
                  </div>
                  <div className="text-xs text-slate-500">
                    Procurement Management
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">
                  欢迎登录
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  请使用您的账号密码登录系统
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    账号
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      placeholder="请输入账号"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      登录中...
                    </>
                  ) : (
                    '登 录'
                  )}
                </button>
              </form>

              <div className="mt-8">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs font-medium text-slate-400">
                    测试账号
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr className="text-slate-500">
                        <th className="px-3 py-2 text-left font-medium">账号</th>
                        <th className="px-3 py-2 text-left font-medium">姓名</th>
                        <th className="px-3 py-2 text-left font-medium">角色</th>
                        <th className="px-3 py-2 text-left font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {testAccounts.map((acc) => (
                        <tr key={acc.account} className="transition-colors hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {acc.account}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{acc.name}</td>
                          <td className="px-3 py-2 text-slate-500">
                            <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                              {ROLE_LABELS[acc.role]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleQuickLogin(acc.account)}
                              className="rounded px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                            >
                              快速登录
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  所有测试账号密码均为 <span className="font-mono font-medium text-slate-500">123456</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
