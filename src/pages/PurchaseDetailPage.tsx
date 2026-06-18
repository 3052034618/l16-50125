import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Send,
  Check,
  X,
  ShoppingBag,
  Truck,
  Package,
  Building2,
  User,
  Calendar,
  Wallet,
  Hash,
  FileText,
} from 'lucide-react';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { ROLE_LABELS } from '@/utils/constants';
import { canApprove } from '@/utils/workflow';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import Modal from '@/components/Modal';
import ApprovalTimeline from '@/components/Layout/ApprovalTimeline';
import EmptyState from '@/components/EmptyState';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { init: initPurchase, getPurchaseById } = usePurchaseStore();
  const { init: initAuth, currentUser } = useAuthStore();
  const toast = useToast();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [orderDate, setOrderDate] = useState(formatDate(new Date(), 'date'));
  const [shipDate, setShipDate] = useState(formatDate(new Date(), 'date'));
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [approveComment, setApproveComment] = useState('');

  useEffect(() => {
    initPurchase();
    initAuth();
  }, [initPurchase, initAuth]);

  const purchase = id ? getPurchaseById(id) : undefined;

  const isApplicant = currentUser && purchase?.applicantId === currentUser.id;
  const isBuyer = currentUser?.role === 'buyer' || currentUser?.role === 'admin';
  const isApprover =
    currentUser &&
    purchase &&
    canApprove(currentUser.role, purchase.status, currentUser.department, purchase.department);

  const handleSubmit = () => {
    if (!purchase || !currentUser) return;
    const result = usePurchaseStore.getState().submitPurchase(purchase.id, currentUser);
    if (result) {
      toast.success('申请已提交');
    } else {
      toast.error('提交失败');
    }
  };

  const handleEdit = () => {
    toast.info('编辑功能待实现');
  };

  const handleApprove = () => {
    if (!purchase || !currentUser) return;
    const result = usePurchaseStore
      .getState()
      .approvePurchase(purchase.id, currentUser, approveComment || undefined);
    if (result) {
      toast.success('审批通过');
      setConfirmApproveOpen(false);
      setApproveComment('');
    } else {
      toast.error('审批失败');
    }
  };

  const handleReject = () => {
    if (!purchase || !currentUser || !rejectComment.trim()) {
      toast.warning('请填写退回意见');
      return;
    }
    const result = usePurchaseStore
      .getState()
      .rejectPurchase(purchase.id, currentUser, rejectComment);
    if (result) {
      toast.success('已退回申请');
      setRejectModalOpen(false);
      setRejectComment('');
    } else {
      toast.error('退回失败');
    }
  };

  const handlePlaceOrder = () => {
    if (!purchase || !supplierName.trim()) {
      toast.warning('请填写供应商名称');
      return;
    }
    const result = usePurchaseStore
      .getState()
      .placeOrder(purchase.id, supplierName.trim(), orderDate);
    if (result) {
      toast.success('已填写下单信息');
      setOrderModalOpen(false);
      setSupplierName('');
      setOrderDate(formatDate(new Date(), 'date'));
    } else {
      toast.error('操作失败');
    }
  };

  const handleMarkShipped = () => {
    if (!purchase) return;
    const result = usePurchaseStore.getState().updateShip(purchase.id, shipDate);
    if (result) {
      toast.success('已标记为已发货');
      setShipModalOpen(false);
      setShipDate(formatDate(new Date(), 'date'));
    } else {
      toast.error('操作失败');
    }
  };

  const handleConfirmReceipt = () => {
    if (!purchase || !currentUser) return;
    const result = usePurchaseStore.getState().confirmReceipt(purchase.id, currentUser);
    if (result) {
      toast.success('已确认收货');
    } else {
      toast.error('操作失败');
    }
  };

  const openConfirmApprove = () => {
    setApproveComment('');
    setConfirmApproveOpen(true);
  };

  if (!purchase) {
    return (
      <div className="min-h-screen">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>
        <EmptyState title="申请不存在" description="该采购申请不存在或已被删除" />
      </div>
    );
  }

  const showApplicantActions =
    isApplicant && (purchase.status === 'draft' || purchase.status === 'rejected');

  const showBuyerPlaceOrder = isBuyer && ['approved', 'auto_approved'].includes(purchase.status);
  const showBuyerMarkShipped = isBuyer && purchase.status === 'ordered';
  const showApplicantReceive = isApplicant && purchase.status === 'shipped';

  return (
    <div className="min-h-screen pb-32">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
      </div>

      <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-mono text-slate-500">{purchase.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{purchase.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={purchase.status} />
              <CategoryBadge category={purchase.category} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              基本信息
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow icon={FileText} label="物品名称" value={purchase.title} />
              <InfoRow
                icon={ShoppingBag}
                label="类别"
                value={<CategoryBadge category={purchase.category} />}
              />
              <InfoRow
                icon={Hash}
                label="数量"
                value={`${purchase.quantity} ${purchase.unit}`}
              />
              <InfoRow
                icon={Wallet}
                label="预算金额"
                value={<span className="font-semibold text-blue-600">{formatCurrency(purchase.budget)}</span>}
              />
              <InfoRow
                icon={Calendar}
                label="期望到货日期"
                value={formatDate(purchase.expectedDate, 'date')}
              />
              <InfoRow icon={Building2} label="申请部门" value={purchase.department} />
              <InfoRow icon={User} label="申请人" value={purchase.applicantName} />
              <InfoRow
                icon={Calendar}
                label="申请时间"
                value={formatDate(purchase.createdAt, 'full')}
              />
            </div>
          </div>

          <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              用途说明
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {purchase.purpose}
            </p>
          </div>

          {(purchase.supplierName ||
            purchase.orderDate ||
            purchase.shipDate ||
            purchase.receiptDate ||
            showBuyerPlaceOrder ||
            showBuyerMarkShipped) && (
            <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                采购进度
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {purchase.supplierName && (
                  <InfoRow icon={Building2} label="供应商" value={purchase.supplierName} />
                )}
                {purchase.orderDate && (
                  <InfoRow
                    icon={Calendar}
                    label="下单日期"
                    value={formatDate(purchase.orderDate, 'date')}
                  />
                )}
                {purchase.shipDate && (
                  <InfoRow
                    icon={Truck}
                    label="发货日期"
                    value={formatDate(purchase.shipDate, 'date')}
                  />
                )}
                {purchase.receiptDate && (
                  <>
                    <InfoRow
                      icon={Package}
                      label="收货日期"
                      value={formatDate(purchase.receiptDate, 'date')}
                    />
                    {purchase.receiptConfirmedBy && (
                      <InfoRow
                        icon={User}
                        label="确认人"
                        value={purchase.receiptConfirmedBy}
                      />
                    )}
                  </>
                )}
                {!purchase.supplierName && !showBuyerPlaceOrder && (
                  <div className="col-span-2 text-sm text-slate-400 italic">
                    暂未填写采购信息
                  </div>
                )}
              </div>
            </div>
          )}

          {purchase.status === 'rejected' && purchase.rejectReason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
                <X className="h-5 w-5" />
                退回原因
              </h2>
              <p className="text-red-600 leading-relaxed">{purchase.rejectReason}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <Check className="h-5 w-5 text-blue-600" />
              审批流程
            </h2>
            <ApprovalTimeline purchase={purchase} />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-end gap-3">
          {showApplicantActions && (
            <>
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Edit className="h-4 w-4" />
                编辑
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Send className="h-4 w-4" />
                {purchase.status === 'rejected' ? '重新提交' : '提交申请'}
              </button>
            </>
          )}

          {isApprover && (
            <>
              <button
                onClick={() => setRejectModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4" />
                退回
              </button>
              <button
                onClick={openConfirmApprove}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Check className="h-4 w-4" />
                通过
              </button>
            </>
          )}

          {showBuyerPlaceOrder && (
            <button
              onClick={() => setOrderModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <ShoppingBag className="h-4 w-4" />
              填写下单信息
            </button>
          )}

          {showBuyerMarkShipped && (
            <button
              onClick={() => setShipModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors shadow-sm"
            >
              <Truck className="h-4 w-4" />
              标记已发货
            </button>
          )}

          {showApplicantReceive && (
            <button
              onClick={handleConfirmReceipt}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Package className="h-4 w-4" />
              确认收货
            </button>
          )}

          {currentUser &&
            !showApplicantActions &&
            !isApprover &&
            !showBuyerPlaceOrder &&
            !showBuyerMarkShipped &&
            !showApplicantReceive && (
              <span className="text-sm text-slate-400">
                当前角色（{ROLE_LABELS[currentUser.role]}）无可用操作
              </span>
            )}
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
          <p className="text-sm text-slate-600">
            确定要通过此采购申请吗？
          </p>
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

      <Modal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="填写下单信息"
        footer={
          <>
            <button
              onClick={() => setOrderModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handlePlaceOrder}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              确认提交
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              供应商名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="请输入供应商名称"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              下单日期
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={shipModalOpen}
        onClose={() => setShipModalOpen(false)}
        title="标记已发货"
        footer={
          <>
            <button
              onClick={() => setShipModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleMarkShipped}
              className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
            >
              确认
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            确认供应商已发货？请选择发货日期：
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              发货日期
            </label>
            <input
              type="date"
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="text-sm text-slate-800 font-medium">{value}</div>
      </div>
    </div>
  );
}
