import type { PurchaseOrder, PurchaseStatus, ApprovalRecord } from '@/types';
import { ROLE_LABELS } from '@/utils/constants';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Clock,
  Circle,
  XCircle,
  FileText,
  ShoppingCart,
  Package,
  Send,
} from 'lucide-react';

interface ApprovalTimelineProps {
  purchase: PurchaseOrder;
}

interface TimelineNode {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'done' | 'current' | 'pending' | 'rejected';
  time?: string;
  actor?: string;
  comment?: string;
}

function formatDateTime(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return dateStr;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  } catch {
    return dateStr;
  }
}

function getNodeStatus(
  status: PurchaseStatus,
  phase: 'submit' | 'auto' | 'manager' | 'finance' | 'director' | 'procurement' | 'receipt'
): 'done' | 'current' | 'pending' | 'rejected' {
  if (status === 'rejected') {
    if (phase === 'submit') return 'done';
    if (phase === 'auto') return 'done';
    const rejectMap: Record<string, string> = {
      manager_pending: 'manager',
      finance_pending: 'finance',
      director_pending: 'director',
    };
    const rejectedAt = rejectMap['manager_pending'] || 'manager';
    if (phase === rejectedAt) return 'rejected';
    const order = ['submit', 'auto', 'manager', 'finance', 'director', 'procurement', 'receipt'];
    const rejectIdx = order.indexOf(rejectedAt);
    const curIdx = order.indexOf(phase);
    return curIdx < rejectIdx ? 'done' : 'pending';
  }

  const statusOrder: { status: PurchaseStatus; phase: typeof phase }[] = [
    { status: 'draft', phase: 'submit' },
    { status: 'pending', phase: 'submit' },
    { status: 'auto_approved', phase: 'auto' },
    { status: 'manager_pending', phase: 'manager' },
    { status: 'finance_pending', phase: 'finance' },
    { status: 'director_pending', phase: 'director' },
    { status: 'approved', phase: 'director' },
    { status: 'ordered', phase: 'procurement' },
    { status: 'shipped', phase: 'procurement' },
    { status: 'received', phase: 'receipt' },
    { status: 'cancelled', phase: 'submit' },
  ];

  const order: (typeof phase)[] = ['submit', 'auto', 'manager', 'finance', 'director', 'procurement', 'receipt'];

  const currentItem = statusOrder.find((s) => s.status === status);
  if (!currentItem) return 'pending';

  const currentPhaseIdx = order.indexOf(currentItem.phase);
  const selfIdx = order.indexOf(phase);

  if (status === 'approved') {
    if (selfIdx <= currentPhaseIdx) return 'done';
    if (selfIdx === currentPhaseIdx + 1) return 'current';
    return 'pending';
  }

  if (selfIdx < currentPhaseIdx) return 'done';
  if (selfIdx === currentPhaseIdx) return 'current';
  return 'pending';
}

function findApprovalRecord(records: ApprovalRecord[], role: 'manager' | 'finance' | 'director'): ApprovalRecord | undefined {
  return records.find((r) => r.approverRole === role && r.action !== 'auto');
}

function findAutoRecord(records: ApprovalRecord[]): ApprovalRecord | undefined {
  return records.find((r) => r.action === 'auto');
}

export default function ApprovalTimeline({ purchase }: ApprovalTimelineProps) {
  const { status, approvalRecords, createdAt, supplierName, orderDate, shipDate, receiptDate, receiptConfirmedBy, rejectReason, applicantName } = purchase;

  const submitRecord = {
    key: 'submit',
    title: '申请提交',
    icon: Send,
    status: getNodeStatus(status, 'submit'),
    time: formatDateTime(createdAt),
    actor: applicantName,
    comment: '采购申请已提交',
  };

  const autoRec = findAutoRecord(approvalRecords);
  const autoNode: TimelineNode = {
    key: 'auto',
    title: '自动审批通过',
    icon: CheckCircle,
    status: getNodeStatus(status, 'auto'),
    time: autoRec ? formatDateTime(autoRec.createdAt) : undefined,
    actor: autoRec?.approverName || '系统',
    comment: autoRec?.comment || '小额申请自动通过',
  };

  const managerRec = findApprovalRecord(approvalRecords, 'manager');
  const managerNode: TimelineNode = {
    key: 'manager',
    title: '部门主管审批',
    icon: FileText,
    status: getNodeStatus(status, 'manager'),
    time: managerRec ? formatDateTime(managerRec.createdAt) : undefined,
    actor: managerRec?.approverName,
    comment: managerRec?.comment,
  };

  const financeRec = findApprovalRecord(approvalRecords, 'finance');
  const financeNode: TimelineNode = {
    key: 'finance',
    title: '财务审批',
    icon: FileText,
    status: getNodeStatus(status, 'finance'),
    time: financeRec ? formatDateTime(financeRec.createdAt) : undefined,
    actor: financeRec?.approverName,
    comment: financeRec?.comment,
  };

  const directorRec = findApprovalRecord(approvalRecords, 'director');
  const directorNode: TimelineNode = {
    key: 'director',
    title: '采购总监审批',
    icon: FileText,
    status: getNodeStatus(status, 'director'),
    time: directorRec ? formatDateTime(directorRec.createdAt) : undefined,
    actor: directorRec?.approverName,
    comment: directorRec?.comment,
  };

  const procurementNode: TimelineNode = {
    key: 'procurement',
    title: '采购执行',
    icon: ShoppingCart,
    status: getNodeStatus(status, 'procurement'),
    time: shipDate ? formatDateTime(shipDate) : orderDate ? formatDateTime(orderDate) : undefined,
    actor: supplierName
      ? shipDate
        ? `${supplierName}（已发货）`
        : `${supplierName}（已下单）`
      : undefined,
    comment: orderDate ? (shipDate ? '供应商已发货，等待收货确认' : '订单已下达，等待供应商发货') : '审批通过后将进入采购执行阶段',
  };

  const receiptNode: TimelineNode = {
    key: 'receipt',
    title: '收货确认',
    icon: Package,
    status: getNodeStatus(status, 'receipt'),
    time: formatDateTime(receiptDate),
    actor: receiptConfirmedBy,
    comment: receiptDate ? '物资已收货确认，流程完成' : undefined,
  };

  const hasAuto = autoRec || status === 'auto_approved' || (['received', 'shipped', 'ordered'].includes(status) && approvalRecords.some((r) => r.action === 'auto'));

  let nodes: TimelineNode[] = [submitRecord];
  if (hasAuto) {
    nodes.push(autoNode);
  } else {
    nodes.push(managerNode, financeNode, directorNode);
  }
  nodes.push(procurementNode, receiptNode);

  if (status === 'rejected') {
    const rejectInfo = approvalRecords.find((r) => r.action === 'reject');
    nodes = nodes.map((n) =>
      n.status === 'rejected'
        ? {
            ...n,
            comment: rejectReason || rejectInfo?.comment || '申请已被退回',
            time: rejectInfo ? formatDateTime(rejectInfo.createdAt) : n.time,
            actor: rejectInfo?.approverName || n.actor,
          }
        : n
    );
  }

  const getIconClasses = (nodeStatus: TimelineNode['status']) => {
    switch (nodeStatus) {
      case 'done':
        return 'bg-emerald-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white ring-4 ring-blue-100';
      case 'rejected':
        return 'bg-red-500 text-white';
      case 'pending':
      default:
        return 'bg-white text-slate-300 ring-2 ring-slate-200';
    }
  };

  const getLineClasses = (nextStatus?: TimelineNode['status'], curStatus?: TimelineNode['status']) => {
    if (!nextStatus) return 'bg-slate-200';
    if (curStatus === 'rejected') return 'bg-red-200';
    if (nextStatus === 'done') return 'bg-emerald-300';
    if (nextStatus === 'current') return 'bg-gradient-to-b from-emerald-300 to-blue-200';
    return 'bg-slate-200';
  };

  const getTitleClasses = (nodeStatus: TimelineNode['status']) => {
    switch (nodeStatus) {
      case 'done':
        return 'text-slate-800';
      case 'current':
        return 'text-blue-600';
      case 'rejected':
        return 'text-red-600';
      case 'pending':
      default:
        return 'text-slate-400';
    }
  };

  const getNodeIcon = (node: TimelineNode) => {
    if (node.status === 'done') {
      if (node.key === 'submit' || node.key === 'procurement' || node.key === 'receipt') {
        return CheckCircle;
      }
      return CheckCircle;
    }
    if (node.status === 'rejected') return XCircle;
    if (node.status === 'current') return Clock;
    return Circle;
  };

  return (
    <div className="w-full">
      <ul className="relative">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          const IconComp = getNodeIcon(node);
          const nextNode = !isLast ? nodes[index + 1] : undefined;
          return (
            <li key={node.key} className="relative pb-7 last:pb-0">
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5',
                    getLineClasses(nextNode?.status, node.status)
                  )}
                />
              )}

              <div className="flex items-start gap-4">
                <div className="relative z-10 mt-0.5">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                      getIconClasses(node.status)
                    )}
                  >
                    <IconComp className="h-4 w-4" />
                  </div>
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={cn('text-sm font-semibold', getTitleClasses(node.status))}>
                      {node.title}
                    </h4>
                    {node.status === 'current' && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                        进行中
                      </span>
                    )}
                    {node.status === 'rejected' && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                        已退回
                      </span>
                    )}
                    {node.status === 'pending' && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        待处理
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {node.actor && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{node.actor}</span>
                        {node.key !== 'submit' && node.key !== 'auto' && node.key !== 'procurement' && node.key !== 'receipt' && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-400">
                              {ROLE_LABELS[node.key as 'manager' | 'finance' | 'director'] || ''}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {node.time && (
                      <div className="text-xs text-slate-400">{node.time}</div>
                    )}
                    {node.comment && (
                      <div
                        className={cn(
                          'mt-1.5 rounded-lg px-3 py-2 text-xs leading-relaxed',
                          node.status === 'rejected'
                            ? 'bg-red-50 text-red-600'
                            : node.status === 'done' || node.status === 'current'
                              ? 'bg-slate-50 text-slate-600'
                              : 'bg-slate-50 text-slate-400'
                        )}
                      >
                        {node.comment}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
