export type UserRole = 'employee' | 'manager' | 'finance' | 'director' | 'buyer' | 'admin';

export type PurchaseCategory =
  | 'office'
  | 'it'
  | 'furniture'
  | 'marketing'
  | 'training'
  | 'other';

export type PurchaseStatus =
  | 'draft'
  | 'pending'
  | 'auto_approved'
  | 'manager_pending'
  | 'finance_pending'
  | 'director_pending'
  | 'rejected'
  | 'approved'
  | 'ordered'
  | 'shipped'
  | 'received'
  | 'cancelled';

export interface User {
  id: string;
  name: string;
  account: string;
  password: string;
  role: UserRole;
  department: string;
  email: string;
  avatar?: string;
}

export interface ApprovalRecord {
  id: string;
  purchaseId: string;
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  action: 'approve' | 'reject' | 'auto';
  comment?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  title: string;
  category: PurchaseCategory;
  purpose: string;
  budget: number;
  quantity: number;
  unit: string;
  expectedDate: string;
  applicantId: string;
  applicantName: string;
  department: string;
  attachments?: string[];
  status: PurchaseStatus;
  currentApprover?: UserRole;
  supplierName?: string;
  orderDate?: string;
  shipDate?: string;
  receiptDate?: string;
  receiptConfirmedBy?: string;
  rejectReason?: string;
  approvalRecords: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface StatisticsData {
  byDepartment: { department: string; count: number; amount: number }[];
  byAmountRange: { range: string; count: number; total: number }[];
  approvalRate: { date: string; submitted: number; approved: number; rate: number }[];
  budgetUsage: { department: string; budget: number; used: number; rate: number }[];
}
