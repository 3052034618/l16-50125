import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  FileText,
  Users,
  Eye,
} from 'lucide-react';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/utils/constants';
import type { PurchaseOrder, PurchaseStatus } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PENDING_STATUSES: PurchaseStatus[] = [
  'manager_pending',
  'finance_pending',
  'director_pending',
  'shipped',
];

const IN_PROGRESS_STATUSES: PurchaseStatus[] = [
  'pending',
  'manager_pending',
  'finance_pending',
  'director_pending',
  'approved',
  'auto_approved',
  'ordered',
  'shipped',
];

const APPROVED_STATUSES: PurchaseStatus[] = [
  'approved',
  'auto_approved',
  'ordered',
  'shipped',
  'received',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const {
    purchases,
    init,
    initialized,
    getPendingForRole,
    getStatistics,
  } = usePurchaseStore();

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthStr = thisMonthStart.toISOString();

  const stats = useMemo(() => {
    const globalStats = getStatistics();

    const todoCount = purchases.filter((p) => {
      if (['shipped'].includes(p.status)) return true;
      if (
        ['manager_pending', 'finance_pending', 'director_pending'].includes(p.status) &&
        currentUser
      ) {
        if (currentUser.role === 'manager') {
          return p.status === 'manager_pending' && p.department === currentUser.department;
        }
        if (currentUser.role === 'finance') return p.status === 'finance_pending';
        if (currentUser.role === 'director') return p.status === 'director_pending';
        if (currentUser.role === 'admin') return true;
      }
      return false;
    }).length;

    const inProgressCount = purchases.filter(
      (p) =>
        IN_PROGRESS_STATUSES.includes(p.status) &&
        currentUser &&
        p.applicantId === currentUser.id
    ).length;

    const monthApprovedCount = purchases.filter(
      (p) =>
        p.createdAt >= thisMonthStr &&
        APPROVED_STATUSES.includes(p.status) &&
        currentUser &&
        p.applicantId === currentUser.id
    ).length;

    const monthAmount = purchases
      .filter(
        (p) =>
          p.createdAt >= thisMonthStr &&
          APPROVED_STATUSES.includes(p.status) &&
          currentUser &&
          p.applicantId === currentUser.id
      )
      .reduce((sum, p) => sum + p.budget, 0);

    return {
      todoCount,
      inProgressCount,
      monthApprovedCount,
      monthAmount,
      totalCount: globalStats.totalCount,
    };
  }, [purchases, currentUser, getStatistics, thisMonthStr]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    const myPurchases = currentUser
      ? purchases.filter((p) => p.applicantId === currentUser.id)
      : purchases;

    myPurchases.forEach((p) => {
      const label = STATUS_LABELS[p.status];
      counts[label] = (counts[label] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const colors = labels.map((label) => {
      const statusKey = Object.keys(STATUS_LABELS).find(
        (k) => STATUS_LABELS[k as PurchaseStatus] === label
      ) as PurchaseStatus;
      const colorMap: Record<string, string> = {
        draft: '#94a3b8',
        pending: '#3b82f6',
        auto_approved: '#10b981',
        manager_pending: '#f59e0b',
        finance_pending: '#a855f7',
        director_pending: '#6366f1',
        rejected: '#ef4444',
        approved: '#22c55e',
        ordered: '#06b6d4',
        shipped: '#0ea5e9',
        received: '#059669',
        cancelled: '#64748b',
      };
      return colorMap[statusKey] || '#64748b';
    });

    return {
      labels,
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [purchases, currentUser]);

  const trendData = useMemo(() => {
    const days = 7;
    const labels: string[] = [];
    const submittedData: number[] = [];
    const approvedData: number[] = [];
    const myPurchases = currentUser
      ? purchases.filter((p) => p.applicantId === currentUser.id)
      : purchases;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
      labels.push(monthDay);

      const daySubmitted = myPurchases.filter(
        (p) => p.createdAt.split('T')[0] === dateStr
      ).length;
      const dayApproved = myPurchases.filter(
        (p) =>
          APPROVED_STATUSES.includes(p.status) &&
          p.createdAt.split('T')[0] === dateStr
      ).length;

      submittedData.push(daySubmitted);
      approvedData.push(dayApproved);
    }

    return {
      labels,
      datasets: [
        {
          label: '提交数量',
          data: submittedData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: '通过数量',
          data: approvedData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [purchases, currentUser]);

  const recentPurchases = useMemo(() => {
    const myPurchases = currentUser
      ? purchases.filter((p) => p.applicantId === currentUser.id)
      : purchases;
    return [...myPurchases]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [purchases, currentUser]);

  const canShowApprovalCenter = useMemo(() => {
    if (!currentUser) return false;
    const pending = getPendingForRole(currentUser.role, currentUser.department);
    return pending.length > 0;
  }, [currentUser, getPendingForRole]);

  const pendingApprovalCount = useMemo(() => {
    if (!currentUser) return 0;
    return getPendingForRole(currentUser.role, currentUser.department).length;
  }, [currentUser, getPendingForRole]);

  const statCards = [
    {
      title: '待办事项',
      subtitle: '待审批 / 待收货',
      value: stats.todoCount,
      icon: ClipboardList,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      title: '进行中申请',
      subtitle: '我的申请',
      value: stats.inProgressCount,
      icon: Clock,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      title: '本月已通过',
      subtitle: '我的申请',
      value: stats.monthApprovedCount,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
    {
      title: '本月采购金额',
      subtitle: '已通过申请',
      value: formatCurrency(stats.monthAmount),
      icon: DollarSign,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
    },
  ];

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          font: { size: 12 },
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          font: { size: 12 },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">工作台</h1>
        <p className="mt-1 text-sm text-slate-500">
          欢迎回来，{currentUser?.name}！今天是 {formatDate(new Date(), 'date')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.subtitle}</p>
                  <p className="mt-3 text-2xl font-bold text-slate-800">{card.value}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">快捷操作</h2>
              <p className="mt-0.5 text-xs text-slate-400">常用功能快速访问</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              onClick={() => navigate('/purchase/new')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-all hover:border-blue-200 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">新建申请</span>
            </button>
            <button
              onClick={() => navigate('/purchase/list')}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 bg-gradient-to-br from-emerald-50 to-green-50 p-4 transition-all hover:border-emerald-200 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">我的申请</span>
            </button>
            {canShowApprovalCenter && (
              <button
                onClick={() => navigate('/approval')}
                className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition-all hover:border-amber-200 hover:shadow-sm"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Users className="h-5 w-5" />
                  {pendingApprovalCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                      {pendingApprovalCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">审批中心</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-base font-semibold text-slate-800">状态分布</h2>
          {statusDistribution.labels.length > 0 ? (
            <div className="h-64">
              <Pie data={statusDistribution} options={pieOptions} />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              暂无数据
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-4 text-base font-semibold text-slate-800">近7天趋势</h2>
        <div className="h-64">
          <Line data={trendData} options={lineOptions} />
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">最近申请</h2>
            <p className="mt-0.5 text-xs text-slate-400">最近10条申请记录</p>
          </div>
          <button
            onClick={() => navigate('/purchase/list')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            查看全部 →
          </button>
        </div>
        {recentPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">单号</th>
                  <th className="px-5 py-3">标题</th>
                  <th className="px-5 py-3">类别</th>
                  <th className="px-5 py-3">预算</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3">申请时间</th>
                  <th className="px-5 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentPurchases.map((item: PurchaseOrder) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/purchase/${item.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{item.id}</td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-slate-800">{item.title}</div>
                      {item.purpose && (
                        <div className="mt-0.5 truncate text-xs text-slate-400 max-w-xs">
                          {item.purpose}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-700">
                      {formatCurrency(item.budget)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {formatDate(item.createdAt, 'short')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/purchase/${item.id}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">暂无申请记录</p>
            <button
              onClick={() => navigate('/purchase/new')}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              新建申请
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
