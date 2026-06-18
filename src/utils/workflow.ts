import type { PurchaseStatus, UserRole } from '@/types';
import { AMOUNT_THRESHOLDS } from './constants';

export function getNextApprovalNode(budget: number): PurchaseStatus {
  if (budget < AMOUNT_THRESHOLDS.SMALL) return 'auto_approved';
  if (budget <= AMOUNT_THRESHOLDS.MEDIUM) return 'manager_pending';
  return 'finance_pending';
}

export function getApproverRoleForStatus(status: PurchaseStatus): UserRole | null {
  switch (status) {
    case 'manager_pending':
      return 'manager';
    case 'finance_pending':
      return 'finance';
    case 'director_pending':
      return 'director';
    default:
      return null;
  }
}

export function handleApproveTransition(currentStatus: PurchaseStatus): PurchaseStatus {
  switch (currentStatus) {
    case 'manager_pending':
      return 'approved';
    case 'finance_pending':
      return 'director_pending';
    case 'director_pending':
      return 'approved';
    case 'auto_approved':
      return 'approved';
    default:
      return currentStatus;
  }
}

export function getApprovalLevel(budget: number): 'small' | 'medium' | 'large' {
  if (budget < AMOUNT_THRESHOLDS.SMALL) return 'small';
  if (budget <= AMOUNT_THRESHOLDS.MEDIUM) return 'medium';
  return 'large';
}

export function getApprovalLevelLabel(level: 'small' | 'medium' | 'large'): string {
  switch (level) {
    case 'small':
      return `小额（< ${AMOUNT_THRESHOLDS.SMALL}元，自动通过）`;
    case 'medium':
      return `中额（${AMOUNT_THRESHOLDS.SMALL}-${AMOUNT_THRESHOLDS.MEDIUM}元，部门主管审批）`;
    case 'large':
      return `大额（> ${AMOUNT_THRESHOLDS.MEDIUM}元，财务+总监联合审批）`;
  }
}

export function canApprove(userRole: UserRole, status: PurchaseStatus, department?: string, applicantDept?: string): boolean {
  switch (status) {
    case 'manager_pending':
      return userRole === 'manager' && department === applicantDept;
    case 'finance_pending':
      return userRole === 'finance';
    case 'director_pending':
      return userRole === 'director';
    default:
      return false;
  }
}

export function canViewApprovalCenter(role: UserRole): boolean {
  return ['manager', 'finance', 'director', 'admin'].includes(role);
}

export function canViewProcurement(role: UserRole): boolean {
  return ['buyer', 'admin'].includes(role);
}

export function canViewStatistics(role: UserRole): boolean {
  return ['manager', 'finance', 'director', 'admin'].includes(role);
}

export function getWorkflowSteps(budget: number): { key: string; label: string; role?: UserRole }[] {
  const level = getApprovalLevel(budget);
  const baseSteps = [
    { key: 'submit', label: '员工提交' },
  ];

  if (level === 'small') {
    return [
      ...baseSteps,
      { key: 'auto', label: '系统自动通过' },
      { key: 'procurement', label: '采购执行' },
      { key: 'receive', label: '收货确认' },
    ];
  }

  if (level === 'medium') {
    return [
      ...baseSteps,
      { key: 'manager', label: '部门主管审批', role: 'manager' as UserRole },
      { key: 'procurement', label: '采购执行' },
      { key: 'receive', label: '收货确认' },
    ];
  }

  return [
    ...baseSteps,
    { key: 'finance', label: '财务审批', role: 'finance' as UserRole },
    { key: 'director', label: '采购总监审批', role: 'director' as UserRole },
    { key: 'procurement', label: '采购执行' },
    { key: 'receive', label: '收货确认' },
  ];
}
