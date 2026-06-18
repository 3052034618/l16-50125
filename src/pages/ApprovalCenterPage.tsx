import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye,
  Check,
  X,
  Search,
  Filter,
  Inbox,
  CheckCircle2,
  Clock,
  Building2,
  User,
  ChevronDown,
  List,
} from 'lucide-react';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/utils/helpers';
import {
  STATUS_LABELS,
  ROLE_LABELS,
  DEPARTMENTS,
} from '@/utils/constants';
import { canApprove, getApproverRoleForStatus } from '@/utils/workflow';
import type { PurchaseOrder, PurchaseStatus, ApprovalRecord } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import DataTable, { DataTableColumn } from '@/components/DataTable';

type TabKey = 'pending' | 'approved' | 'all';

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof Inbox }[] = [
  { key: 'pending', label: '待我审批', icon: Inbox },
  { key: 'approved', label: '我已审批', icon: CheckCircle2 },
  { key: 'all', label: '全部', icon: List },
];

export default function ApprovalCenterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    init: initPurchase,
    getPendingForRole,
    purchases,
    approvePurchase,
    rejectPurchase,
  } = usePurchaseStore();
  const { init: initAuth, currentUser } = useAuthStore();
  const toast = useToast();

  const tabFromUrl = searchParams.get('tab');
  const keywordFromUrl = searchParams.get('keyword') || '';
  const filterStatusFromUrl = searchParams.get('status') || '';
  const filterDeptFromUrl = searchParams.get('dept') || '';

  const [activeTab, setActiveTab] = useState<TabKey>(
    tabFromUrl === 'pending' || tabFromUrl === 'approved' || tabFromUrl === 'all'
      ? tabFromUrl
      : 'pending'
  );
  const [keyword, setKeyword] = useState(keywordFromUrl);
  const [filterStatus, setFilterStatus] = useState<PurchaseStatus | ''>(
    filterStatusFromUrl as PurchaseStatus | ''
  );
  const [filterDepartment, setFilterDepartment] = useState(filterDeptFromUrl);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PurchaseOrder | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PurchaseOrder | null>(null);
  const [approveComment, setApproveComment] = useState('');

  useEffect(() => {
    initPurchase();
    initAuth();
  }, [initPurchase, initAuth]);

  const syncSearchParams = useCallback(
    (tab: TabKey, kw: string, status: string, dept: string) => {
      const params: Record<string, string> = { tab };
      if (kw) params.keyword = kw;
      if (status) params.status = status;
      if (dept) params.dept = dept;
      setSearchParams(params);
    },
    [setSearchParams]
  );

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    syncSearchParams(tab, keyword, filterStatus, filterDepartment);
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    syncSearchParams(activeTab, value, filterStatus, filterDepartment);
  };

  const handleFilterStatusChange = (value: PurchaseStatus | '') => {
    setFilterStatus(value);
    setShowStatusDropdown(false);
    syncSearchParams(activeTab, keyword, value, filterDepartment);
  };

  const handleFilterDeptChange = (value: string) => {
    setFilterDepartment(value);
    setShowDeptDropdown(false);
    syncSearchParams(activeTab, keyword, filterStatus, value);
  };

  const pendingList = useMemo(() => {
    if (!currentUser) return [];
    const list = getPendingForRole(currentUser.role, currentUser.department);
    return filterList(list, keyword, filterDepartment);
  }, [currentUser, getPendingForRole, keyword, filterDepartment, purchases]);

  const approvedList = useMemo(() => {
    if (!currentUser) return [];
    const list = purchases.filter((p) =>
      p.approvalRecords.some((r) => r.approverId === currentUser.id)
    );
    return filterList(list, keyword, filterDepartment, filterStatus || undefined);
  }, [currentUser, purchases, keyword, filterDepartment, filterStatus]);

  const allList = useMemo(() => {
    if (!currentUser) return [];
    const pendingIds = new Set(
      getPendingForRole(currentUser.role, currentUser.department).map((p) => p.id)
    );
    const approvedIds = new Set(
      purchases
        .filter((p) => p.approvalRecords.some((r) => r.approverId === currentUser.id))
        .map((p) => p.id)
    );
    const list = purchases.filter((p) => pendingIds.has(p.id) || approvedIds.has(p.id));
    return filterList(list, keyword, filterDepartment, filterStatus || undefined);
  }, [currentUser, getPendingForRole, purchases, keyword, filterDepartment, filterStatus]);

  function filterList(
    list: PurchaseOrder[],
    kw: string,
    dept: string,
    status?: PurchaseStatus
  ): PurchaseOrder[] {
    return list.filter((p) => {
      if (kw) {
        const k = kw.toLowerCase();
        const match =
          p.title.toLowerCase().includes(k) ||
          p.id.toLowerCase().includes(k) ||
          p.applicantName.toLowerCase().includes(k);
        if (!match) return false;
      }
      if (dept && p.department !== dept) return false;
      if (status && p.status !== status) return false;
      return true;
    });
  }

  const pendingCount = currentUser
    ? getPendingForRole(currentUser.role, currentUser.department).length
    : 0;

  const approvedCount = currentUser
    ? purchases.filter((p) =>
        p.approvalRecords.some((r) => r.approverId === currentUser.id)
      ).length
    : 0;

  const openReject = (row: PurchaseOrder) => {
    setRejectTarget(row);
    setRejectComment('');
    setRejectModalOpen(true);
  };

  const handleReject = () => {
    if (!rejectTarget || !currentUser || !rejectComment.trim()) {
      toast.warning('请填写退回意见');
      return;
    }
    const result = rejectPurchase(rejectTarget.id, currentUser, rejectComment);
    if (result) {
      toast.success(`已退回申请「${rejectTarget.title}」`);
      setRejectModalOpen(false);
      setRejectTarget(null);
      setRejectComment('');
    } else {
      toast.error('操作失败');
    }
  };

  const openConfirmApprove = (row: PurchaseOrder) => {
    setApproveTarget(row);
    setApproveComment('');
    setConfirmApproveOpen(true);
  };

  const handleApprove = () => {
    if (!approveTarget || !currentUser) return;
    const result = approvePurchase(
      approveTarget.id,
      currentUser,
      approveComment || undefined
    );
    if (result) {
      toast.success(`已通过「${approveTarget.title}」`);
      setConfirmApproveOpen(false);
      setApproveTarget(null);
      setApproveComment('');
    } else {
      toast.error('操作失败');
    }
  };

  const canUserApprove = (row: PurchaseOrder) => {
    if (!currentUser) return false;
    return canApprove(
      currentUser.role,
      row.status,
      currentUser.department,
      row.department
    );
  };

  const getMyRecord = (row: PurchaseOrder): ApprovalRecord | undefined => {
    if (!currentUser) return undefined;
    const records = row.approvalRecords.filter((r) => r.approverId === currentUser.id);
    return records[records.length - 1];
  };

  const navigateToDetail = (row: PurchaseOrder) => {
    syncSearchParams(activeTab, keyword, filterStatus, filterDepartment);
    navigate(`/purchase/${row.id}`);
  };

  const pendingColumns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'id',
      title: '单号',
      width: '160px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.id}</span>
      ),
    },
    {
      key: 'title',
      title: '标题',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-slate-800 truncate max-w-[240px]">
            {row.title}
          </div>
          <div className="mt-0.5">
            <CategoryBadge category={row.category} />
          </div>
        </div>
      ),
    },
    {
      key: 'applicant',
      title: '申请人',
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-700">{row.applicantName}</span>
        </div>
      ),
    },
    {
      key: 'department',
      title: '部门',
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-700">{row.department}</span>
        </div>
      ),
    },
    {
      key: 'budget',
      title: '预算',
      width: '120px',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-blue-600">
          {formatCurrency(row.budget)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: '提交时间',
      width: '140px',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs">{formatDate(row.createdAt, 'short')}</span>
        </div>
      ),
    },
    {
      key: 'currentNode',
      title: '当前节点',
      width: '130px',
      render: (row) => {
        const role = getApproverRoleForStatus(row.status);
        return (
          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 border border-slate-200">
            {role ? ROLE_LABELS[role] : '-'}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: '状态',
      width: '130px',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '200px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => navigateToDetail(row)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </button>
          {canUserApprove(row) && (
            <>
              <button
                onClick={() => openReject(row)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                退回
              </button>
              <button
                onClick={() => openConfirmApprove(row)}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                通过
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const historyColumns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'id',
      title: '单号',
      width: '160px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.id}</span>
      ),
    },
    {
      key: 'title',
      title: '标题',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-slate-800 truncate max-w-[240px]">
            {row.title}
          </div>
          <div className="mt-0.5">
            <CategoryBadge category={row.category} />
          </div>
        </div>
      ),
    },
    {
      key: 'applicant',
      title: '申请人',
      width: '100px',
      render: (row) => (
        <span className="text-slate-700">{row.applicantName}</span>
      ),
    },
    {
      key: 'department',
      title: '部门',
      width: '100px',
      render: (row) => <span className="text-slate-700">{row.department}</span>,
    },
    {
      key: 'budget',
      title: '预算',
      width: '120px',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-blue-600">
          {formatCurrency(row.budget)}
        </span>
      ),
    },
    {
      key: 'myResult',
      title: '我的审批',
      width: '180px',
      render: (row) => {
        const rec = getMyRecord(row);
        if (!rec) return <span className="text-slate-400">-</span>;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              {rec.action === 'approve' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  已通过
                </span>
              ) : rec.action === 'reject' ? (
                <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                  <X className="h-3.5 w-3.5" />
                  已退回
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium">
                  系统自动
                </span>
              )}
            </div>
            {rec.comment && (
              <div className="mt-1 text-xs text-slate-500 truncate max-w-[180px]">
                {rec.comment}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'myTime',
      title: '审批时间',
      width: '140px',
      render: (row) => {
        const rec = getMyRecord(row);
        return rec ? (
          <span className="text-xs text-slate-500">
            {formatDate(rec.createdAt, 'short')}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: 'status',
      title: '当前状态',
      width: '130px',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      title: '操作',
      width: '100px',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => navigateToDetail(row)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            详情
          </button>
        </div>
      ),
    },
  ];

  const currentStatusLabel = filterStatus
    ? STATUS_LABELS[filterStatus]
    : '全部状态';
  const currentDeptLabel = filterDepartment || '全部部门';

  const renderTabContent = () => {
    if (activeTab === 'pending') {
      return pendingList.length === 0 ? (
        <EmptyState
          title="暂无待审批申请"
          description={
            pendingCount === 0
              ? '目前没有需要您审批的采购申请'
              : '当前筛选条件下没有待审批申请'
          }
        />
      ) : (
        <DataTable
          columns={pendingColumns}
          data={pendingList}
          rowKey={(r) => r.id}
          onRowClick={(row) => navigateToDetail(row)}
        />
      );
    }

    if (activeTab === 'approved') {
      return approvedList.length === 0 ? (
        <EmptyState
          title="暂无已审批记录"
          description="您还没有审批过任何采购申请"
        />
      ) : (
        <DataTable
          columns={historyColumns}
          data={approvedList}
          rowKey={(r) => r.id}
          onRowClick={(row) => navigateToDetail(row)}
        />
      );
    }

    return allList.length === 0 ? (
      <EmptyState
        title="暂无审批相关记录"
        description="没有与您相关的审批记录"
      />
    ) : (
      <DataTable
        columns={historyColumns}
        data={allList}
        rowKey={(r) => r.id}
        onRowClick={(row) => navigateToDetail(row)}
      />
    );
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">审批中心</h1>
        <p className="text-sm text-slate-500">管理需要您审批的采购申请</p>
      </div>

      <div className="rounded-xl shadow-sm border border-slate-200 bg-white">
        <div className="flex items-center border-b border-slate-200 px-6">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const count =
              tab.key === 'pending'
                ? pendingCount
                : tab.key === 'approved'
                ? approvedCount
                : pendingCount + approvedCount;
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`relative px-6 py-4 text-sm font-medium transition-colors ${
                  active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.key === 'pending' && pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[11px] font-semibold px-1.5">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                  {tab.key !== 'pending' && count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-semibold px-1.5">
                      {count}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="搜索单号、标题、申请人..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {activeTab !== 'pending' && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowDeptDropdown(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Filter className="h-4 w-4 text-slate-400" />
                {currentStatusLabel}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full mt-1 left-0 z-20 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                  <button
                    onClick={() => handleFilterStatusChange('')}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                      !filterStatus ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                    }`}
                  >
                    全部状态
                  </button>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleFilterStatusChange(key as PurchaseStatus)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                        filterStatus === key
                          ? 'text-blue-600 font-medium bg-blue-50'
                          : 'text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => {
                setShowDeptDropdown(!showDeptDropdown);
                setShowStatusDropdown(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              {currentDeptLabel}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {showDeptDropdown && (
              <div className="absolute top-full mt-1 left-0 z-20 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                <button
                  onClick={() => handleFilterDeptChange('')}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                    !filterDepartment ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                  }`}
                >
                  全部部门
                </button>
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => handleFilterDeptChange(dept)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                      filterDepartment === dept
                        ? 'text-blue-600 font-medium bg-blue-50'
                        : 'text-slate-700'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      <Modal
        open={confirmApproveOpen}
        onClose={() => setConfirmApproveOpen(false)}
        title="确认通过"
        footer={
          <>
            <button
              onClick={() => setConfirmApproveOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleApprove}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              确认通过
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {approveTarget && (
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs font-mono text-slate-500 mb-1">
                {approveTarget.id}
              </div>
              <div className="font-medium text-slate-800">
                {approveTarget.title}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                申请人：{approveTarget.applicantName} · {approveTarget.department} ·{' '}
                {formatCurrency(approveTarget.budget)}
              </div>
            </div>
          )}
          <p className="text-sm text-slate-600">确定要通过此采购申请吗？</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              审批意见（选填）
            </label>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={3}
              placeholder="请输入审批意见..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="退回申请"
        footer={
          <>
            <button
              onClick={() => setRejectModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              确认退回
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {rejectTarget && (
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs font-mono text-slate-500 mb-1">
                {rejectTarget.id}
              </div>
              <div className="font-medium text-slate-800">
                {rejectTarget.title}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                申请人：{rejectTarget.applicantName} · {rejectTarget.department} ·{' '}
                {formatCurrency(rejectTarget.budget)}
              </div>
            </div>
          )}
          <p className="text-sm text-slate-600">
            请填写退回原因，以便申请人修改后重新提交：
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              退回意见 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
              placeholder="请详细说明退回原因..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
