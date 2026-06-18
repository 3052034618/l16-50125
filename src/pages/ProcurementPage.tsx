import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Calendar,
  Building2,
  ClipboardList,
  Truck,
  PackageCheck,
  Eye,
  ShoppingCart,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import StatusBadge from '@/components/StatusBadge';
import CategoryBadge from '@/components/CategoryBadge';
import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { DEPARTMENTS } from '@/utils/constants';
import { formatCurrency, formatDate, getDaysFromNow } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import type { PurchaseOrder } from '@/types';

type TabKey = 'pending' | 'procuring' | 'completed';

const TABS: { key: TabKey; label: string; icon: typeof ClipboardList }[] = [
  { key: 'pending', label: '待下单', icon: ClipboardList },
  { key: 'procuring', label: '采购中', icon: Truck },
  { key: 'completed', label: '已完成', icon: PackageCheck },
];

export default function ProcurementPage() {
  const { purchases, init: initPurchase, placeOrder, updateShip, confirmReceipt } = usePurchaseStore();
  const { currentUser, init: initAuth } = useAuthStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [department, setDepartment] = useState('');

  const [detailModal, setDetailModal] = useState<PurchaseOrder | null>(null);
  const [orderModal, setOrderModal] = useState<PurchaseOrder | null>(null);
  const [shipModal, setShipModal] = useState<PurchaseOrder | null>(null);
  const [receiveModal, setReceiveModal] = useState<PurchaseOrder | null>(null);

  const [supplierName, setSupplierName] = useState('');
  const [orderDate, setOrderDate] = useState(formatDate(new Date(), 'date'));
  const [orderNo, setOrderNo] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [shipDate, setShipDate] = useState(formatDate(new Date(), 'date'));
  const [receiptDate, setReceiptDate] = useState(formatDate(new Date(), 'date'));

  useEffect(() => {
    initAuth();
    initPurchase();
  }, [initAuth, initPurchase]);

  const counts = useMemo(() => {
    const pending = purchases.filter((p) =>
      ['approved', 'auto_approved'].includes(p.status)
    ).length;
    const procuring = purchases.filter((p) =>
      ['ordered', 'shipped'].includes(p.status)
    ).length;
    const completed = purchases.filter((p) => p.status === 'received').length;
    return { pending, procuring, completed };
  }, [purchases]);

  const filtered = useMemo(() => {
    let list: PurchaseOrder[] = [];

    if (activeTab === 'pending') {
      list = purchases.filter((p) => ['approved', 'auto_approved'].includes(p.status));
    } else if (activeTab === 'procuring') {
      list = purchases.filter((p) => ['ordered', 'shipped'].includes(p.status));
    } else {
      list = purchases.filter((p) => p.status === 'received');
    }

    if (keyword) {
      const k = keyword.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(k) ||
          p.id.toLowerCase().includes(k) ||
          p.applicantName.toLowerCase().includes(k) ||
          p.purpose.toLowerCase().includes(k)
      );
    }

    if (dateFrom) {
      list = list.filter((p) => p.createdAt >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((p) => p.createdAt <= dateTo + 'T23:59:59');
    }

    if (department) {
      list = list.filter((p) => p.department === department);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchases, activeTab, keyword, dateFrom, dateTo, department]);

  const resetModals = () => {
    setSupplierName('');
    setOrderDate(formatDate(new Date(), 'date'));
    setOrderNo('');
    setExpectedShipDate('');
    setShipDate(formatDate(new Date(), 'date'));
    setReceiptDate(formatDate(new Date(), 'date'));
  };

  const handlePlaceOrder = () => {
    if (!orderModal) return;
    if (!supplierName.trim()) {
      toast.error('请填写供应商名称');
      return;
    }
    const result = placeOrder(orderModal.id, supplierName.trim(), orderDate, orderNo.trim() || undefined, expectedShipDate || undefined);
    if (result) {
      toast.success('下单成功');
      setOrderModal(null);
      resetModals();
    } else {
      toast.error('下单失败');
    }
  };

  const handleUpdateShip = () => {
    if (!shipModal) return;
    const result = updateShip(shipModal.id, shipDate);
    if (result) {
      toast.success('已标记发货');
      setShipModal(null);
      resetModals();
    } else {
      toast.error('操作失败');
    }
  };

  const handleConfirmReceive = () => {
    if (!receiveModal || !currentUser) return;
    const result = confirmReceipt(receiveModal.id, currentUser, receiptDate);
    if (result) {
      toast.success('已确认收货');
      setReceiveModal(null);
      resetModals();
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
    icon: typeof ClipboardList;
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
        <h1 className="text-2xl font-bold text-slate-800">采购执行</h1>
        <p className="text-sm text-slate-500 mt-1">管理采购全流程，从下单到收货确认</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="待下单" count={counts.pending} icon={ClipboardList} color="bg-amber-500" />
        <StatCard label="采购中" count={counts.procuring} icon={Truck} color="bg-blue-500" />
        <StatCard label="已完成" count={counts.completed} icon={PackageCheck} color="bg-emerald-500" />
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
                  {tab.key === 'pending'
                    ? counts.pending
                    : tab.key === 'procuring'
                    ? counts.procuring
                    : counts.completed}
                </span>
              </button>
            );
          })}
          </div>
        </div>

        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索单号、标题、申请人..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm outline-none text-slate-600 bg-transparent"
              />
              <span className="text-slate-400">至</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm outline-none text-slate-600 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-sm outline-none text-slate-600 bg-transparent"
              >
                <option value="">全部部门</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState
              title="暂无数据"
              description={
                activeTab === 'pending'
                  ? '当前没有需要处理的采购申请'
                  : activeTab === 'procuring'
                  ? '当前没有正在采购的订单'
                  : '暂无已完成的采购记录'
              }
            />
          ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <th className="px-6 py-3">单号</th>
                    <th className="px-6 py-3">标题</th>
                    <th className="px-6 py-3">分类</th>
                    <th className="px-6 py-3">申请人</th>
                    <th className="px-6 py-3">部门</th>
                    <th className="px-6 py-3">预算</th>
                    {activeTab === 'pending' && <th className="px-6 py-3">期望到货</th>}
                    {activeTab === 'pending' && <th className="px-6 py-3">剩余天数</th>}
                    {(activeTab === 'procuring' || activeTab === 'completed') && (
                      <th className="px-6 py-3">供应商</th>
                    )}
                    {activeTab !== 'pending' && <th className="px-6 py-3">下单日期</th>}
                    {activeTab !== 'pending' && <th className="px-6 py-3">状态</th>}
                    {(activeTab === 'procuring' || activeTab === 'completed') && (
                      <th className="px-6 py-3">发货日期</th>
                    )}
                    {activeTab === 'completed' && <th className="px-6 py-3">收货日期</th>}
                    <th className="px-6 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const days = getDaysFromNow(item.expectedDate);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-slate-700">{item.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-800">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.quantity}
                            {item.unit}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <CategoryBadge category={item.category} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.applicantName}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.department}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {formatCurrency(item.budget)}
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(item.expectedDate, 'date')}
                          </td>
                        )}
                        {activeTab === 'pending' && (
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                                days <= 3
                                  ? 'bg-red-50 text-red-600'
                                  : days <= 7
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-emerald-50 text-emerald-600'
                              )}
                            >
                              {days > 0 ? `${days}天` : days === 0 ? '今天' : `逾期${-days}天`}
                            </span>
                          </td>
                        )}
                        {(activeTab === 'procuring' || activeTab === 'completed') && (
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.supplierName || '-'}
                          </td>
                        )}
                        {activeTab !== 'pending' && (
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.orderDate || '-'}
                          </td>
                        )}
                        {activeTab !== 'pending' && (
                          <td className="px-6 py-4">
                            <StatusBadge status={item.status} size="sm" />
                          </td>
                        )}
                        {(activeTab === 'procuring' || activeTab === 'completed') && (
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.shipDate || '-'}
                          </td>
                        )}
                        {activeTab === 'completed' && (
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.receiptDate || '-'}
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
                                  setOrderModal(item);
                                  setOrderDate(formatDate(new Date(), 'date'));
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                下单处理
                              </button>
                            )}
                            {activeTab === 'procuring' && item.status === 'ordered' && (
                              <button
                                onClick={() => {
                                  setShipModal(item);
                                  setShipDate(formatDate(new Date(), 'date'));
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
                              >
                                <Send className="h-4 w-4" />
                                标记发货
                              </button>
                            )}
                            {activeTab === 'procuring' && item.status === 'shipped' && (
                              <button
                                onClick={() => {
                                  setReceiveModal(item);
                                  setReceiptDate(formatDate(new Date(), 'date'));
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                标记收货
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                <p className="text-xs text-slate-500">标题</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{detailModal.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">分类</p>
                <div className="mt-1">
                  <CategoryBadge category={detailModal.category} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">申请人</p>
                <p className="text-sm text-slate-700 mt-1">{detailModal.applicantName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">部门</p>
                <p className="text-sm text-slate-700 mt-1">{detailModal.department}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">预算金额</p>
                <p className="text-sm font-medium text-slate-800 mt-1">
                  {formatCurrency(detailModal.budget)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">数量</p>
                <p className="text-sm text-slate-700 mt-1">
                  {detailModal.quantity} {detailModal.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">期望到货日期</p>
                <p className="text-sm text-slate-700 mt-1">
                  {formatDate(detailModal.expectedDate, 'date')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">申请时间</p>
                <p className="text-sm text-slate-700 mt-1">
                  {formatDate(detailModal.createdAt)}
                </p>
              </div>
              {detailModal.supplierName && (
                <div>
                  <p className="text-xs text-slate-500">供应商</p>
                  <p className="text-sm text-slate-700 mt-1">{detailModal.supplierName}</p>
                </div>
              )}
              {detailModal.orderNo && (
                <div>
                  <p className="text-xs text-slate-500">订单号</p>
                  <p className="text-sm text-slate-700 mt-1 font-mono">{detailModal.orderNo}</p>
                </div>
              )}
              {detailModal.orderDate && (
                <div>
                  <p className="text-xs text-slate-500">下单日期</p>
                  <p className="text-sm text-slate-700 mt-1">{detailModal.orderDate}</p>
                </div>
              )}
              {detailModal.expectedShipDate && (
                <div>
                  <p className="text-xs text-slate-500">预计发货时间</p>
                  <p className="text-sm text-slate-700 mt-1">{detailModal.expectedShipDate}</p>
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
        open={!!orderModal}
        onClose={() => {
          setOrderModal(null);
          resetModals();
        }}
        title="下单处理"
        footer={
          <>
            <button
              onClick={() => {
                setOrderModal(null);
                resetModals();
              }}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handlePlaceOrder}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
            >
              确认下单
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {orderModal && (
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">{orderModal.title}</p>
              <p className="text-xs text-blue-600 mt-1">
                {orderModal.id} · {formatCurrency(orderModal.budget)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              供应商名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="请输入供应商名称"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">订单号</label>
            <input
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="请输入供应商订单号"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">下单日期</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">预计发货时间</label>
              <input
                type="date"
                value={expectedShipDate}
                onChange={(e) => setExpectedShipDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!shipModal}
        onClose={() => {
          setShipModal(null);
          resetModals();
        }}
        title="标记已发货"
        footer={
          <>
            <button
              onClick={() => {
                setShipModal(null);
                resetModals();
              }}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleUpdateShip}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
            >
              确认发货
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {shipModal && (
            <div className="rounded-lg bg-sky-50 p-4">
              <p className="text-sm font-medium text-sky-800">{shipModal.title}</p>
              <p className="text-xs text-sky-600 mt-1">
                {shipModal.id} · 供应商：{shipModal.supplierName}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">发货日期</label>
            <input
              type="date"
              value={shipDate}
              onChange={(e) => setShipDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!receiveModal}
        onClose={() => {
          setReceiveModal(null);
          resetModals();
        }}
        title="确认收货"
        footer={
          <>
            <button
              onClick={() => {
                setReceiveModal(null);
                resetModals();
              }}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmReceive}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              确认收货
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {receiveModal && (
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">{receiveModal.title}</p>
              <p className="text-xs text-emerald-600 mt-1">
                {receiveModal.id} · 供应商：{receiveModal.supplierName}
              </p>
            </div>
          )}
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
