import { create } from 'zustand';
import type {
  PurchaseOrder,
  PurchaseStatus,
  PurchaseCategory,
  ApprovalRecord,
  SupplementaryNote,
  User,
} from '@/types';
import { mockPurchases } from '@/data/mockPurchases';
import { getStorage, setStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import {
  generatePurchaseId,
  generateId,
  formatDate,
} from '@/utils/helpers';
import {
  getNextApprovalNode,
  handleApproveTransition,
} from '@/utils/workflow';

interface PurchaseState {
  purchases: PurchaseOrder[];
  initialized: boolean;
  init: () => void;
  createPurchase: (
    data: Omit<
      PurchaseOrder,
      | 'id'
      | 'status'
      | 'approvalRecords'
      | 'supplementaryNotes'
      | 'createdAt'
      | 'updatedAt'
      | 'applicantId'
      | 'applicantName'
      | 'department'
      | 'currentApprover'
    >,
    applicant: User,
    asDraft?: boolean
  ) => PurchaseOrder;
  updatePurchase: (id: string, updates: Partial<PurchaseOrder>) => PurchaseOrder | null;
  deletePurchase: (id: string) => boolean;
  getPurchaseById: (id: string) => PurchaseOrder | undefined;
  getPurchasesByApplicant: (applicantId: string) => PurchaseOrder[];
  getPurchasesByDepartment: (department: string) => PurchaseOrder[];
  getPurchasesByStatus: (status: PurchaseStatus) => PurchaseOrder[];
  getPendingForRole: (role: string, department?: string) => PurchaseOrder[];
  submitPurchase: (id: string, user: User) => PurchaseOrder | null;
  approvePurchase: (id: string, user: User, comment?: string) => PurchaseOrder | null;
  rejectPurchase: (id: string, user: User, comment: string) => PurchaseOrder | null;
  addSupplementaryNote: (id: string, user: User, content: string) => PurchaseOrder | null;
  placeOrder: (id: string, supplierName: string, orderDate?: string, orderNo?: string, expectedShipDate?: string) => PurchaseOrder | null;
  updateShip: (id: string, shipDate?: string) => PurchaseOrder | null;
  confirmReceipt: (id: string, user: User, receiptDate?: string) => PurchaseOrder | null;
  searchPurchases: (params: {
    keyword?: string;
    status?: PurchaseStatus;
    category?: PurchaseCategory;
    department?: string;
    applicantId?: string;
    dateFrom?: string;
    dateTo?: string;
    minBudget?: number;
    maxBudget?: number;
  }) => PurchaseOrder[];
  getStatistics: () => {
    totalCount: number;
    totalAmount: number;
    pendingCount: number;
    approvedCount: number;
    receivedCount: number;
    rejectedCount: number;
  };
}

function savePurchases(purchases: PurchaseOrder[]) {
  setStorage(STORAGE_KEYS.PURCHASES, purchases);
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchases: [],
  initialized: false,

  init: () => {
    if (get().initialized) return;
    let purchases = getStorage<PurchaseOrder[]>(STORAGE_KEYS.PURCHASES, []);
    if (purchases.length === 0) {
      purchases = mockPurchases;
    }
    purchases = purchases.map((p) => ({
      ...p,
      supplementaryNotes: p.supplementaryNotes || [],
    }));
    savePurchases(purchases);
    set({ purchases, initialized: true });
  },

  createPurchase: (data, applicant, asDraft = false) => {
    const now = new Date().toISOString();
    const id = generatePurchaseId();

    let status: PurchaseStatus = 'draft';
    let currentApprover = undefined;
    const approvalRecords: ApprovalRecord[] = [];

    if (!asDraft) {
      const nextNode = getNextApprovalNode(data.budget);
      status = nextNode;
      if (nextNode === 'auto_approved') {
        approvalRecords.push({
          id: generateId('ar_'),
          purchaseId: id,
          approverId: 'system',
          approverName: '系统',
          approverRole: 'admin',
          action: 'auto',
          comment: `小额申请(${data.budget}元)，自动通过`,
          createdAt: now,
        });
      }
    }

    const newPurchase: PurchaseOrder = {
      ...data,
      id,
      status,
      currentApprover,
      applicantId: applicant.id,
      applicantName: applicant.name,
      department: applicant.department,
      approvalRecords,
      supplementaryNotes: [],
      createdAt: now,
      updatedAt: now,
    };

    const next = [newPurchase, ...get().purchases];
    savePurchases(next);
    set({ purchases: next });
    return newPurchase;
  },

  updatePurchase: (id, updates) => {
    const list = get().purchases;
    const idx = list.findIndex((p) => p.id === id);
    if (idx < 0) return null;

    const updated: PurchaseOrder = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const next = [...list];
    next[idx] = updated;
    savePurchases(next);
    set({ purchases: next });
    return updated;
  },

  deletePurchase: (id) => {
    const list = get().purchases;
    const exists = list.some((p) => p.id === id);
    if (!exists) return false;
    const next = list.filter((p) => p.id !== id);
    savePurchases(next);
    set({ purchases: next });
    return true;
  },

  getPurchaseById: (id) => get().purchases.find((p) => p.id === id),

  getPurchasesByApplicant: (applicantId) =>
    get().purchases.filter((p) => p.applicantId === applicantId),

  getPurchasesByDepartment: (department) =>
    get().purchases.filter((p) => p.department === department),

  getPurchasesByStatus: (status) => get().purchases.filter((p) => p.status === status),

  getPendingForRole: (role, department) => {
    return get().purchases.filter((p) => {
      if (role === 'manager') {
        return p.status === 'manager_pending' && p.department === department;
      }
      if (role === 'finance') return p.status === 'finance_pending';
      if (role === 'director') return p.status === 'director_pending';
      if (role === 'admin') {
        return ['manager_pending', 'finance_pending', 'director_pending'].includes(p.status);
      }
      return false;
    });
  },

  submitPurchase: (id, user) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase || !['draft', 'rejected'].includes(purchase.status)) return null;
    if (purchase.applicantId !== user.id) return null;

    const nextNode = getNextApprovalNode(purchase.budget);
    const approvalRecords = [...purchase.approvalRecords];

    if (purchase.status === 'rejected') {
      approvalRecords.push({
        id: generateId('ar_'),
        purchaseId: id,
        approverId: user.id,
        approverName: user.name,
        approverRole: user.role,
        action: 'resubmit',
        comment: '申请人重新提交',
        createdAt: new Date().toISOString(),
      });
    }

    if (nextNode === 'auto_approved') {
      approvalRecords.push({
        id: generateId('ar_'),
        purchaseId: id,
        approverId: 'system',
        approverName: '系统',
        approverRole: 'admin',
        action: 'auto',
        comment: `小额申请(${purchase.budget}元)，自动通过`,
        createdAt: new Date().toISOString(),
      });
    }

    return get().updatePurchase(id, {
      status: nextNode,
      approvalRecords,
      rejectReason: undefined,
    });
  },

  approvePurchase: (id, user, comment) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase) return null;

    const newStatus = handleApproveTransition(purchase.status);
    if (newStatus === purchase.status) return null;

    const record: ApprovalRecord = {
      id: generateId('ar_'),
      purchaseId: id,
      approverId: user.id,
      approverName: user.name,
      approverRole: user.role,
      action: 'approve',
      comment,
      createdAt: new Date().toISOString(),
    };

    return get().updatePurchase(id, {
      status: newStatus,
      approvalRecords: [...purchase.approvalRecords, record],
      currentApprover: undefined,
    });
  },

  rejectPurchase: (id, user, comment) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase) return null;

    const record: ApprovalRecord = {
      id: generateId('ar_'),
      purchaseId: id,
      approverId: user.id,
      approverName: user.name,
      approverRole: user.role,
      action: 'reject',
      comment,
      createdAt: new Date().toISOString(),
    };

    return get().updatePurchase(id, {
      status: 'rejected',
      approvalRecords: [...purchase.approvalRecords, record],
      currentApprover: undefined,
      rejectReason: comment,
    });
  },

  addSupplementaryNote: (id, user, content) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase) return null;

    const note: SupplementaryNote = {
      id: generateId('sn_'),
      purchaseId: id,
      authorId: user.id,
      authorName: user.name,
      content,
      createdAt: new Date().toISOString(),
    };

    return get().updatePurchase(id, {
      supplementaryNotes: [...(purchase.supplementaryNotes || []), note],
    });
  },

  placeOrder: (id, supplierName, orderDate, orderNo, expectedShipDate) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase) return null;
    if (!['approved', 'auto_approved'].includes(purchase.status)) return null;

    return get().updatePurchase(id, {
      status: 'ordered',
      supplierName,
      orderDate: orderDate || formatDate(new Date(), 'date'),
      orderNo,
      expectedShipDate,
    });
  },

  updateShip: (id, shipDate) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase || purchase.status !== 'ordered') return null;

    return get().updatePurchase(id, {
      status: 'shipped',
      shipDate: shipDate || formatDate(new Date(), 'date'),
    });
  },

  confirmReceipt: (id, user, receiptDate) => {
    const purchase = get().getPurchaseById(id);
    if (!purchase || purchase.status !== 'shipped') return null;

    return get().updatePurchase(id, {
      status: 'received',
      receiptDate: receiptDate || formatDate(new Date(), 'date'),
      receiptConfirmedBy: user.name,
    });
  },

  searchPurchases: (params) => {
    const {
      keyword,
      status,
      category,
      department,
      applicantId,
      dateFrom,
      dateTo,
      minBudget,
      maxBudget,
    } = params;

    return get().purchases.filter((p) => {
      if (keyword) {
        const k = keyword.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(k) ||
          p.id.toLowerCase().includes(k) ||
          p.purpose.toLowerCase().includes(k) ||
          p.applicantName.toLowerCase().includes(k);
        if (!matches) return false;
      }
      if (status && p.status !== status) return false;
      if (category && p.category !== category) return false;
      if (department && p.department !== department) return false;
      if (applicantId && p.applicantId !== applicantId) return false;
      if (dateFrom && p.createdAt < dateFrom) return false;
      if (dateTo && p.createdAt > dateTo + 'T23:59:59') return false;
      if (minBudget !== undefined && p.budget < minBudget) return false;
      if (maxBudget !== undefined && p.budget > maxBudget) return false;
      return true;
    });
  },

  getStatistics: () => {
    const list = get().purchases;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthList = list.filter((p) => p.createdAt.startsWith(thisMonth));

    return {
      totalCount: list.length,
      totalAmount: monthList.reduce((s, p) => s + p.budget, 0),
      pendingCount: list.filter((p) =>
        ['manager_pending', 'finance_pending', 'director_pending'].includes(p.status)
      ).length,
      approvedCount: monthList.filter((p) =>
        ['approved', 'auto_approved', 'ordered', 'shipped', 'received'].includes(p.status)
      ).length,
      receivedCount: list.filter((p) => p.status === 'received').length,
      rejectedCount: list.filter((p) => p.status === 'rejected').length,
    };
  },
}));
