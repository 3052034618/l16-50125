import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  FileText,
  DollarSign,
  CalendarDays,
  AlignLeft,
  Hash,
  Boxes,
  ArrowLeft,
  Save,
  Send,
  Info,
  ShieldCheck,
  Users,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useToast } from '@/hooks/useToast';
import { CATEGORY_LABELS, UNIT_OPTIONS, AMOUNT_THRESHOLDS, ROLE_LABELS } from '@/utils/constants';
import { formatCurrency, formatDate, getFutureDate } from '@/utils/helpers';
import type { PurchaseCategory } from '@/types';

interface FormData {
  title: string;
  category: PurchaseCategory;
  quantity: number;
  unit: string;
  budget: number;
  expectedDate: string;
  purpose: string;
}

interface FormErrors {
  title?: string;
  budget?: string;
  expectedDate?: string;
}

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { createPurchase, init, initialized } = usePurchaseStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    title: '',
    category: 'office',
    quantity: 1,
    unit: UNIT_OPTIONS[0],
    budget: 0,
    expectedDate: getFutureDate(7),
    purpose: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [init, initialized]);

  const today = formatDate(new Date(), 'date');

  const approvalInfo = useMemo(() => {
    const budget = form.budget;
    if (budget <= 0) {
      return null;
    }
    if (budget < AMOUNT_THRESHOLDS.SMALL) {
      return {
        level: 'small' as const,
        title: '小额采购',
        icon: ShieldCheck,
        color: 'emerald' as const,
        description: `预算 ${formatCurrency(budget)} 小于 ${formatCurrency(AMOUNT_THRESHOLDS.SMALL)}，系统自动通过`,
      };
    }
    if (budget < AMOUNT_THRESHOLDS.MEDIUM) {
      return {
        level: 'medium' as const,
        title: '中额采购',
        icon: Users,
        color: 'amber' as const,
        description: `预算 ${formatCurrency(budget)} 在 ${formatCurrency(AMOUNT_THRESHOLDS.SMALL)} - ${formatCurrency(AMOUNT_THRESHOLDS.MEDIUM)} 之间，需部门主管 + 财务审批`,
      };
    }
    return {
      level: 'large' as const,
      title: '大额采购',
      icon: Building2,
      color: 'indigo' as const,
      description: `预算 ${formatCurrency(budget)} 大于等于 ${formatCurrency(AMOUNT_THRESHOLDS.MEDIUM)}，需部门 + 财务 + 总监联合审批`,
    };
  }, [form.budget]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.title.trim()) {
      newErrors.title = '请输入物品名称';
    }

    if (form.budget <= 0) {
      newErrors.budget = '预算必须大于 0';
    }

    if (!form.expectedDate) {
      newErrors.expectedDate = '请选择期望到货日期';
    } else if (form.expectedDate < today) {
      newErrors.expectedDate = '期望到货日期不能小于今天';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FormErrors];
        return next;
      });
    }
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!currentUser) return;

    if (!asDraft && !validate()) {
      toastError('请检查表单填写是否正确');
      return;
    }

    setSubmitting(true);

    try {
      const purchase = createPurchase(
        {
          title: form.title.trim(),
          category: form.category,
          quantity: form.quantity,
          unit: form.unit,
          budget: form.budget,
          expectedDate: form.expectedDate,
          purpose: form.purpose.trim(),
        },
        currentUser,
        asDraft
      );

      if (asDraft) {
        toastSuccess('草稿保存成功');
      } else {
        toastSuccess('申请提交成功');
      }

      navigate(`/purchase/${purchase.id}`);
    } catch {
      toastError(asDraft ? '草稿保存失败' : '申请提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const InputWrapper = ({
    icon: Icon,
    label,
    required,
    children,
    error,
  }: {
    icon: React.ElementType;
    label: string;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
  }) => (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-slate-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );

  const inputBaseClass =
    'w-full rounded-lg border bg-slate-50 py-2.5 px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20';

  const approvalColorClass = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">新建采购申请</h1>
          {currentUser && (
            <p className="mt-1 text-sm text-slate-500">
              申请人：{currentUser.name}（{currentUser.department} · {ROLE_LABELS[currentUser.role]}）
            </p>
          )}
        </div>
      </div>

      {approvalInfo && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${approvalColorClass[approvalInfo.color]}`}
        >
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {(() => {
                const IconComp = approvalInfo.icon;
                return (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <IconComp className="h-4 w-4" />
                    {approvalInfo.title}
                  </span>
                );
              })()}
            </div>
            <p className="mt-0.5 text-sm opacity-90">{approvalInfo.description}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Package className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">基本信息</h2>
          </div>

          <div className="space-y-4">
            <InputWrapper icon={FileText} label="物品名称" required error={errors.title}>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="请输入物品名称，如：A4打印纸"
                className={`${inputBaseClass} ${errors.title ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500'}`}
              />
            </InputWrapper>

            <InputWrapper icon={Boxes} label="物品类别" required>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value as PurchaseCategory)}
                className={`${inputBaseClass} border-slate-200 focus:border-blue-500`}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </InputWrapper>

            <div className="grid grid-cols-2 gap-4">
              <InputWrapper icon={Hash} label="数量" required>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => handleChange('quantity', Math.max(1, Number(e.target.value) || 1))}
                  className={`${inputBaseClass} w-full border-slate-200 focus:border-blue-500`}
                />
              </InputWrapper>

              <InputWrapper icon={Package} label="单位" required>
                <select
                  value={form.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className={`${inputBaseClass} w-full border-slate-200 focus:border-blue-500`}
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </InputWrapper>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">采购详情</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputWrapper icon={DollarSign} label="预算 (元)" required error={errors.budget}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.budget || ''}
                  onChange={(e) => handleChange('budget', Number(e.target.value) || 0)}
                  placeholder="请输入预算金额"
                  className={`${inputBaseClass} ${errors.budget
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </InputWrapper>

              <InputWrapper icon={CalendarDays} label="期望到货日期" required error={errors.expectedDate}>
                <input
                  type="date"
                  value={form.expectedDate}
                  min={today}
                  onChange={(e) => handleChange('expectedDate', e.target.value)}
                  className={`${inputBaseClass} ${errors.expectedDate
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </InputWrapper>
            </div>

            <InputWrapper icon={AlignLeft} label="用途说明">
              <textarea
                value={form.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                placeholder="请详细描述采购用途，如用途、使用场景等"
                rows={6}
                className={`${inputBaseClass} resize-none border-slate-200 focus:border-blue-500`}
              />
            </InputWrapper>

            {form.budget > 0 && (
              <div className="rounded-lg bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">预估预算金额</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(form.budget)}</span>
                </div>
                {form.quantity > 0 && form.unit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">数量</span>
                    <span className="text-slate-700">
                      {form.quantity} {form.unit}
                    </span>
                  </div>
                )}
                {form.quantity > 0 && form.budget > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">单价预估</span>
                    <span className="text-slate-700">
                      {formatCurrency(form.budget / form.quantity)} / {form.unit}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            <span className="text-red-500">*</span> 为必填项
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              保存草稿
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              提交申请
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
