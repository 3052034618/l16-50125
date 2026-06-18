import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit3,
  Undo2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileText,
  ListFilter,
  Inbox,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useToast } from '@/hooks/useToast';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { PurchaseOrder, PurchaseStatus, PurchaseCategory } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import EmptyState from '@/components/EmptyState';

interface FilterParams {
  keyword: string;
  status: PurchaseStatus | '';
  category: PurchaseCategory | '';
  dateFrom: string;
  dateTo: string;
}

const CANCELLABLE_STATUSES: PurchaseStatus[] = [
  'pending',
  'manager_pending',
  'finance_pending',
  'director_pending',
];

const PAGE_SIZE = 10;

export default function PurchaseListPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const {
    init,
    initialized,
    searchPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
  } = usePurchaseStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const [filters, setFilters] = useState<FilterParams>({
    keyword: '',
    status: '',
    category: '',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  const filteredList = useMemo(() => {
    if (!currentUser) return [];
    const params: Record<string, unknown> = {
      applicantId: currentUser.id,
    };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    return searchPurchases(params as Parameters<typeof searchPurchases>[0]);
  }, [filters, currentUser, searchPurchases]);

  const sortedList = useMemo(() => {
    return [...filteredList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredList]);

  const totalPages = Math.max(1, Math.ceil(sortedList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = sortedList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const summary = useMemo(() => {
    const counts: Record<PurchaseStatus, number> = {
      draft: 0,
      pending: 0,
      auto_approved: 0,
      manager_pending: 0,
      finance_pending: 0,
      director_pending: 0,
      rejected: 0,
      approved: 0,
      ordered: 0,
      shipped: 0,
      received: 0,
      cancelled: 0,
    };

    const allList = currentUser
      ? searchPurchases({ applicantId: currentUser.id })
      : [];

    allList.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });

    const inProgress =
      counts.manager_pending +
      counts.finance_pending +
      counts.director_pending +
      counts.auto_approved +
      counts.approved +
      counts.ordered +
      counts.shipped;

    return {
      total: allList.length,
      draft: counts.draft,
      inProgress,
      approved: counts.auto_approved + counts.approved,
      received: counts.received,
      rejected: counts.rejected,
      cancelled: counts.cancelled,
    };
  }, [currentUser, searchPurchases]);

  const summaryTags = [
    { label: '全部', value: summary.total, color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { label: '草稿', value: summary.draft, color: 'bg-gray-50 text-gray-700 border-gray-200' },
    {
      label: '审批中',
      value: summary.inProgress,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: '已通过',
      value: summary.approved,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: '已收货',
      value: summary.received,
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    { label: '已退回', value: summary.rejected, color: 'bg-red-50 text-red-700 border-red-200' },
  ];

  const handleCancel = (item: PurchaseOrder) => {
    if (!CANCELLABLE_STATUSES.includes(item.status)) return;
    if (window.confirm(`确认撤回申请「${item.title}」？`)) {
      const updated = updatePurchase(item.id, { status: 'cancelled' });
      if (updated) {
        toastSuccess('申请已撤回');
      } else {
        toastError('撤回失败');
      }
    }
  };

  const handleFilterChange = <K extends keyof FilterParams>(
    key: K,
    value: FilterParams[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      status: '',
      category: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  const handleDelete = (item: PurchaseOrder) => {
    if (item.status !== 'draft') return;
    if (window.confirm(`确认删除草稿「${item.title}」？此操作不可恢复。`)) {
      if (deletePurchase(item.id)) {
        toastSuccess('草稿已删除');
      } else {
        toastError('删除失败');
      }
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">我的申请</h1>
          <p className="mt-1 text-sm text-slate-500">查看和管理您的所有采购申请</p>
        </div>
        <button
          onClick={() => navigate('/purchase/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          新建申请
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {summaryTags.map((tag) => (
          <span
            key={tag.label}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tag.color}`}
          >
            {tag.label}
            <span className="font-semibold">{tag.value}</span>
          </span>
        ))}
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
              placeholder="搜索单号、标题、用途..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ListFilter className="h-4 w-4" />
            高级筛选
            {(filters.status || filters.category || filters.dateFrom || filters.dateTo) && (
              <span className="flex h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Filter className="h-3.5 w-3.5" />
                  状态
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    handleFilterChange('status', e.target.value as PurchaseStatus | '')
                  }
                  className={inputClass}
                >
                  <option value="">全部状态</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <FileText className="h-3.5 w-3.5" />
                  类别
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange('category', e.target.value as PurchaseCategory | '')
                  }
                  className={inputClass}
                >
                  <option value="">全部类别</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  开始日期
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  结束日期
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleResetFilters}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                重置
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
        {sortedList.length > 0 ? (
          <>
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
                  {pageData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/purchase/${item.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{item.id}</td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-slate-800">{item.title}</div>
                        {item.purpose && (
                          <div className="mt-0.5 truncate max-w-xs text-xs text-slate-400">
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
                      <td className="px-5 py-3">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/purchase/${item.id}`)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            详情
                          </button>
                          {item.status === 'draft' && (
                            <>
                              <button
                                onClick={() => navigate(`/purchase/new?edit=${item.id}`)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                                删除
                              </button>
                            </>
                          )}
                          {CANCELLABLE_STATUSES.includes(item.status) && (
                            <button
                              onClick={() => handleCancel(item)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              撤回
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                共 {sortedList.length} 条记录，第 {currentPage} / {totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 5) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="mx-1 text-xs text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                          p === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Inbox}
            title="暂无申请记录"
            description={
              filters.keyword ||
              filters.status ||
              filters.category ||
              filters.dateFrom ||
              filters.dateTo
                ? '没有找到符合条件的申请，请尝试调整筛选条件'
                : '您还没有创建任何采购申请，点击下方按钮开始新建'
            }
            action={
              !(
                filters.keyword ||
                filters.status ||
                filters.category ||
                filters.dateFrom ||
                filters.dateTo
              ) && (
                <button
                  onClick={() => navigate('/purchase/new')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  新建申请
                </button>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
