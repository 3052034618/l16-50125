import type { PurchaseCategory, PurchaseStatus, UserRole } from '@/types';

export const AMOUNT_THRESHOLDS = {
  SMALL: 2000,
  MEDIUM: 10000,
} as const;

export const CATEGORY_LABELS: Record<PurchaseCategory, string> = {
  office: '办公用品',
  it: 'IT设备',
  furniture: '办公家具',
  marketing: '市场物料',
  training: '培训教育',
  other: '其他',
};

export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: '草稿',
  pending: '待处理',
  auto_approved: '自动通过',
  manager_pending: '待部门主管审批',
  finance_pending: '待财务审批',
  director_pending: '待采购总监审批',
  rejected: '已退回',
  approved: '审批通过',
  ordered: '已下单',
  shipped: '已发货',
  received: '已收货',
  cancelled: '已撤回',
};

export const STATUS_COLORS: Record<PurchaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  auto_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manager_pending: 'bg-amber-50 text-amber-700 border-amber-200',
  finance_pending: 'bg-purple-50 text-purple-700 border-purple-200',
  director_pending: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  ordered: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  shipped: 'bg-sky-50 text-sky-700 border-sky-200',
  received: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: '普通员工',
  manager: '部门主管',
  finance: '财务审批人',
  director: '采购总监',
  buyer: '采购员',
  admin: '管理员',
};

export const DEPARTMENTS = [
  '技术部',
  '市场部',
  '财务部',
  '采购部',
  '行政部',
  '人力资源部',
  '产品部',
  '运营部',
] as const;

export const UNIT_OPTIONS = ['件', '台', '个', '套', '箱', '本', '张', '米', '千克', '其他'];

export const STORAGE_KEYS = {
  USERS: 'procurement_users',
  PURCHASES: 'procurement_purchases',
  CURRENT_USER: 'procurement_current_user',
} as const;

export const DEPARTMENT_BUDGETS: Record<string, number> = {
  技术部: 500000,
  市场部: 300000,
  财务部: 100000,
  采购部: 800000,
  行政部: 150000,
  人力资源部: 120000,
  产品部: 200000,
  运营部: 250000,
};
