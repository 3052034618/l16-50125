import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Calendar, TrendingUp, BarChart3, PieChart, Activity, DollarSign } from 'lucide-react';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAuthStore } from '@/store/authStore';
import EmptyState from '@/components/EmptyState';
import { DEPARTMENT_BUDGETS } from '@/utils/constants';
import { formatCurrency, formatDate, getPastDate } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import type { PurchaseOrder } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TimeRange = 'month' | 'quarter' | 'year' | 'all';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季度' },
  { key: 'year', label: '本年度' },
  { key: 'all', label: '全部' },
];

function getStartDate(range: TimeRange): string | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (range) {
    case 'month':
      return `${y}-${String(m + 1).padStart(2, '0')}-01`;
    case 'quarter': {
      const qm = Math.floor(m / 3) * 3;
      return `${y}-${String(qm + 1).padStart(2, '0')}-01`;
    }
    case 'year':
      return `${y}-01-01`;
    case 'all':
    default:
      return null;
  }
}

export default function StatisticsPage() {
  const { purchases, init: initPurchase } = usePurchaseStore();
  const { init: initAuth } = useAuthStore();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  useEffect(() => {
    initAuth();
    initPurchase();
  }, [initAuth, initPurchase]);

  const filteredPurchases = useMemo(() => {
    const start = getStartDate(timeRange);
    if (!start) return purchases;
    return purchases.filter((p) => p.createdAt >= start);
  }, [purchases, timeRange]);

  const departmentFrequency = useMemo(() => {
    const map = new Map<string, number>();
    filteredPurchases.forEach((p) => {
      map.set(p.department, (map.get(p.department) || 0) + 1);
    });
    const depts = Array.from(map.keys());
    return {
      labels: depts,
      data: depts.map((d) => map.get(d) || 0),
    };
  }, [filteredPurchases]);

  const amountRange = useMemo(() => {
    const ranges = [
      { label: '0-2k', min: 0, max: 2000, count: 0 },
      { label: '2k-10k', min: 2000, max: 10000, count: 0 },
      { label: '10k-50k', min: 10000, max: 50000, count: 0 },
      { label: '50k+', min: 50000, max: Infinity, count: 0 },
    ];
    filteredPurchases.forEach((p) => {
      for (const r of ranges) {
        if (p.budget >= r.min && p.budget < r.max) {
          r.count++;
          break;
        }
      }
    });
    return {
      labels: ranges.map((r) => r.label),
      data: ranges.map((r) => r.count),
    };
  }, [filteredPurchases]);

  const approvalRateTrend = useMemo(() => {
    const days: { date: string; submitted: number; approved: number }[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d, 'date');
      days.push({ date: dateStr, submitted: 0, approved: 0 });
    }

    const approvedStatuses = ['approved', 'auto_approved', 'ordered', 'shipped', 'received'];
    const allSubmittedStatuses = [...approvedStatuses, 'rejected', 'manager_pending', 'finance_pending', 'director_pending'];

    purchases.forEach((p) => {
      const pDate = formatDate(p.createdAt, 'date');
      const entry = days.find((d) => d.date === pDate);
      if (!entry) return;
      if (allSubmittedStatuses.includes(p.status)) {
        entry.submitted++;
      }
      if (approvedStatuses.includes(p.status)) {
        entry.approved++;
      }
    });

    return {
      labels: days.map((d) => d.date.slice(5)),
      data: days.map((d) => (d.submitted === 0 ? 0 : Math.round((d.approved / d.submitted) * 100))),
    };
  }, [purchases]);

  const budgetUsage = useMemo(() => {
    const usedMap = new Map<string, number>();
    const budgetPurchases: PurchaseOrder[] = timeRange === 'all'
      ? purchases
      : filteredPurchases;

    budgetPurchases.forEach((p) => {
      if (['approved', 'auto_approved', 'ordered', 'shipped', 'received'].includes(p.status)) {
        usedMap.set(p.department, (usedMap.get(p.department) || 0) + p.budget);
      }
    });

    const depts = Object.keys(DEPARTMENT_BUDGETS);
    return depts.map((d) => ({
      department: d,
      budget: DEPARTMENT_BUDGETS[d],
      used: usedMap.get(d) || 0,
      rate: DEPARTMENT_BUDGETS[d] === 0 ? 0 : Math.min(100, Math.round(((usedMap.get(d) || 0) / DEPARTMENT_BUDGETS[d]) * 100)),
    }));
  }, [purchases, filteredPurchases, timeRange]);

  const stats = useMemo(() => {
    const total = filteredPurchases.length;
    const amount = filteredPurchases.reduce((s, p) => s + p.budget, 0);
    const approved = filteredPurchases.filter((p) =>
      ['approved', 'auto_approved', 'ordered', 'shipped', 'received'].includes(p.status)
    ).length;
    const rate = total === 0 ? 0 : Math.round((approved / total) * 100);
    return { total, amount, approved, rate };
  }, [filteredPurchases]);

  const chartColors = {
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  };

  const departmentChartData = {
    labels: departmentFrequency.labels,
    datasets: [
      {
        label: '申请数量',
        data: departmentFrequency.data,
        backgroundColor: (ctx: unknown) => {
          const c = ctx as { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } };
          const { chart } = c;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return chartColors.primary;
          const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, '#93c5fd');
          gradient.addColorStop(1, '#2563eb');
          return gradient;
        },
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const departmentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { size: 12 },
          stepSize: 1,
        },
      },
    },
  };

  const amountChartData = {
    labels: amountRange.labels,
    datasets: [
      {
        data: amountRange.data,
        backgroundColor: chartColors.colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const amountChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          color: '#64748b',
          font: { size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
      },
    },
  };

  const approvalChartData = {
    labels: approvalRateTrend.labels,
    datasets: [
      {
        label: '通过率(%)',
        data: approvalRateTrend.data,
        borderColor: chartColors.primary,
        backgroundColor: (ctx: unknown) => {
          const c = ctx as { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } };
          const { chart } = c;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return 'rgba(59, 130, 246, 0.1)';
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const approvalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => `通过率: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { size: 12 },
          callback: (v: number | string) => `${v}%`,
        },
      },
    },
  };

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
  }: {
    label: string;
    value: string;
    icon: typeof BarChart3;
    color: string;
  }) => (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-4">
        <div className={cn('rounded-xl p-3', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 truncate">{label}</p>
          <p className="text-xl font-bold text-slate-800 mt-1 truncate">{value}</p>
        </div>
      </div>
    </div>
  );

  const ChartCard = ({
    title,
    description,
    icon: Icon,
    children,
  }: {
    title: string;
    description: string;
    icon: typeof BarChart3;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="rounded-lg bg-blue-50 p-2">
          <Icon className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );

  if (purchases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">统计分析</h1>
          <p className="text-sm text-slate-500 mt-1">多维度数据分析，助力采购决策</p>
        </div>
        <EmptyState title="暂无数据" description="系统中暂无采购数据，无法生成统计报表" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">统计分析</h1>
          <p className="text-sm text-slate-500 mt-1">多维度数据分析，助力采购决策</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm border border-slate-100">
          <Calendar className="h-4 w-4 text-slate-400 ml-2" />
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                timeRange === r.key
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="申请总数"
          value={String(stats.total)}
          icon={BarChart3}
          color="bg-blue-500"
        />
        <StatCard
          label="采购总额"
          value={formatCurrency(stats.amount)}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatCard
          label="通过数量"
          value={String(stats.approved)}
          icon={TrendingUp}
          color="bg-sky-500"
        />
        <StatCard
          label="整体通过率"
          value={`${stats.rate}%`}
          icon={Activity}
          color="bg-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="部门申请频次"
          description="各部门提交采购申请的数量分布"
          icon={BarChart3}
        >
          {departmentFrequency.data.length === 0 ||
          departmentFrequency.data.every((v) => v === 0) ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-400">暂无数据</p>
            </div>
          ) : (
            <Bar data={departmentChartData} options={departmentChartOptions} />
          )}
        </ChartCard>

        <ChartCard
          title="金额区间分布"
          description="按预算金额区间统计的申请数量占比"
          icon={PieChart}
        >
          {amountRange.data.every((v) => v === 0) ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-400">暂无数据</p>
            </div>
          ) : (
            <Doughnut data={amountChartData} options={amountChartOptions} />
          )}
        </ChartCard>

        <ChartCard
          title="审批通过率趋势"
          description="近30天每日审批通过率变化曲线"
          icon={TrendingUp}
        >
          <Line data={approvalChartData} options={approvalChartOptions} />
        </ChartCard>

        <ChartCard
          title="部门预算使用率"
          description="各部门预算与实际使用情况对比"
          icon={DollarSign}
        >
          <div className="space-y-4 overflow-y-auto pr-2 max-h-64">
            {budgetUsage.map((item) => (
              <div key={item.department}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    {item.department}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatCurrency(item.used)} / {formatCurrency(item.budget)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        item.rate >= 90
                          ? 'bg-gradient-to-r from-red-400 to-red-500'
                          : item.rate >= 70
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-blue-400 to-blue-500'
                      )}
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold w-12 text-right',
                      item.rate >= 90
                        ? 'text-red-600'
                        : item.rate >= 70
                        ? 'text-amber-600'
                        : 'text-blue-600'
                    )}
                  >
                    {item.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
