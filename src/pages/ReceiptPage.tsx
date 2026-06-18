import { useEffect, useMemo, useState } from 'react';
import { Package, PackageCheck, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { formatDate } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import type { PurchaseOrder } from '@/types';

type TabKey = 'pending' | 'received';

const TABS: { key: TabKey; label: string; icon: typeof Package }[] = [
  { key: 'pending', label: '待收货', icon: Package },
  { key: 'received', label: '已收货', icon: PackageCheck },
];

export default function ReceiptPage() {
  const { purchases, init: initPurchase, confirmReceipt } = usePurchaseStore();
  const { currentUser, init: initAuth } = useAuthStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [detailModal, setDetailModal] = useState<PurchaseOrder | null>(null);
  const [confirmModal, setConfirmModal] = useState<PurchaseOrder | null>(null);
  const [receiptDate, setReceiptDate] = useState(formatDate(new Date(), 'date'));

  useEffect(() => {
    initAuth();
    initPurchase();
  }, [initAuth, initPurchase]);

  const filtered = useMemo(() => {
    if (!currentUser) return [];

    let list: PurchaseOrder[] = [];

    if (activeTab === 'pending') {
      list = purchases.filter(
        (p) => p.status === 'shipped' && p.applicantId === currentUser.id
      );
    } else {
      list = purchases.filter(
        (p) => p.status === 'received' && p.applicantId === currentUser.id
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchases, activeTab, currentUser]);

  const counts = useMemo(() => {
    if (!currentUser) return { pending: 0, received: 0 };
    return {
      pending: purchases.filter(
        (p) => p.status === 'shipped' && p.applicantId === currentUser.id
      ).length,
      received: purchases.filter(
        (p) => p.status === 'received' && p.applicantId === currentUser.id
      ).length,
    };
  }, [purchases, currentUser]);

  const handleConfirmReceipt = () => {
    if (!confirmModal || !currentUser) return;
    const result = confirmReceipt(confirmModal.id, currentUser, receiptDate);
    if (result) {
      toast.success('收货确认成功');
      setConfirmModal(null);
    } else {
      toast.error('操作失败');
    }
  };

  const StatCard = ({
    label,
    count,
    icon: Icon,
    color,
  }: {
    label: string;
    count: number;
    icon: typeof Package;
    color: string;
  }) => (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-4">
        <div className={cn('rounded-xl p-3', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{count}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">收货确认</h1>
        <p className="text-sm text-slate-500 mt-1">确认您申请采购物品的收货情况</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <StatCard label="待收货" count={counts.pending} icon={Package} color="bg-sky-500" />
        <StatCard label="已收货" count={counts.received} icon={PackageCheck} color="bg-emerald-500" />
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pt-4">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                    active
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {tab.key === 'pending' ? counts.pending : counts.received}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState
              title={activeTab === 'pending' ? '暂无待收货' : '暂无收货记录'}
              description={
                activeTab === 'pending'
                  ? '当前没有需要您确认收货的订单'
                  : '您还没有确认过收货的订单'
              }
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">单号</th>
                  <th className="px-6 py-3">物品名称</th>
                  <th className="px-6 py-3">分类</th>
                  <th className="px-6 py-3">数量</th>
                  <th className="px-6 py-3">供应商</th>
                  {activeTab === 'pending' && <th className="px-6 py-3">发货日期</th>}
                  {activeTab === 'received' && <th className="px-6 py-3">收货日期</th>}
                  {activeTab === 'received' && <th className="px-6 py-3">收货人</th>}
                  {activeTab === 'pending' && <th className="px-6 py-3">状态</th>}
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700">{item.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.supplierName || '-'}
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.shipDate || '-'}
                      </td>
                    )}
                    {activeTab === 'received' && (
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.receiptDate || '-'}
                      </td>
                    )}
                    {activeTab === 'received' && (
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.receiptConfirmedBy || '-'}
                      </td>
                    )}
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailModal(item)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          详情
                        </button>
                        {activeTab === 'pending' && (
                          <button
                            onClick={() => {
                              setConfirmModal(item);
                              setReceiptDate(formatDate(new Date(), 'date'));
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            确认收货
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="采购详情"
        size="lg"
      >
        {detailModal && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">单号</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{detailModal.id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">状态</p>
                <div className="mt-1">
                  <StatusBadge status={detailModal.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">物品名称</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{detailModal.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">分类</p>
                <div className="mt-1">
                  <CategoryBadge category={detailModal.category} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">数量</p>
                <p className="text-sm text-slate-700 mt-1">
                  {detailModal.quantity} {detailModal.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">供应商</p>
                <p className="text-sm text-slate-700 mt-1">
                  {detailModal.supplierName || '-'}
                </p>
              </div>
              {detailModal.orderDate && (
                <div>
                  <p className="text-xs text-slate-500">下单日期</p>
                  <p className="text-sm text-slate-700 mt-1">{detailModal.orderDate}</p>
                </div>
              )}
              {detailModal.shipDate && (
                <div>
                  <p className="text-xs text-slate-500">发货日期</p>
                  <p className="text-sm text-slate-700 mt-1">{detailModal.shipDate}</p>
                </div>
              )}
              {detailModal.receiptDate && (
                <div>
                  <p className="text-xs text-slate-500">收货日期</p>
                  <p className="text-sm text-slate-700 mt-1">{detailModal.receiptDate}</p>
                </div>
              )}
              {detailModal.receiptConfirmedBy && (
                <div>
                  <p className="text-xs text-slate-500">收货人</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {detailModal.receiptConfirmedBy}
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">采购用途</p>
              <p className="text-sm text-slate-700 mt-1">{detailModal.purpose}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title="确认收货"
        footer={
          <>
            <button
            onClick={() => setConfirmModal(null)}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirmReceipt}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            确认收货
          </button>
        </>
        }
      >
        <div className="space-y-4">
          {confirmModal && (
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">
                {confirmModal.title}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {confirmModal.id} · {confirmModal.quantity}
                {confirmModal.unit} · 供应商：{confirmModal.supplierName}
              </p>
            </div>
          )}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">二次确认</p>
              <p className="text-xs text-amber-600 mt-1">
                请确认您已实际收到货物，确认后订单状态将变更为已收货。
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">收货日期</label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          {currentUser && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">收货人</p>
              <p className="text-sm text-slate-700 mt-1">{currentUser.name}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
