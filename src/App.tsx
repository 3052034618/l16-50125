import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "@/components/Toast";
import AppLayout from "@/components/Layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import NewPurchasePage from "@/pages/NewPurchasePage";
import PurchaseListPage from "@/pages/PurchaseListPage";
import PurchaseDetailPage from "@/pages/PurchaseDetailPage";
import ApprovalCenterPage from "@/pages/ApprovalCenterPage";
import ProcurementPage from "@/pages/ProcurementPage";
import ReceiptPage from "@/pages/ReceiptPage";
import StatisticsPage from "@/pages/StatisticsPage";

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <AppLayout pageTitle="工作台">
                <DashboardPage />
              </AppLayout>
            }
          />

          <Route
            path="/purchase/list"
            element={
              <AppLayout pageTitle="我的申请">
                <PurchaseListPage />
              </AppLayout>
            }
          />

          <Route
            path="/purchase/new"
            element={
              <AppLayout pageTitle="新建采购申请">
                <NewPurchasePage />
              </AppLayout>
            }
          />

          <Route
            path="/purchase/:id"
            element={
              <AppLayout pageTitle="申请详情">
                <PurchaseDetailPage />
              </AppLayout>
            }
          />

          <Route
            path="/approval"
            element={
              <AppLayout pageTitle="审批中心">
                <ApprovalCenterPage />
              </AppLayout>
            }
          />

          <Route
            path="/procurement"
            element={
              <AppLayout pageTitle="采购执行">
                <ProcurementPage />
              </AppLayout>
            }
          />

          <Route
            path="/receipt"
            element={
              <AppLayout pageTitle="收货确认">
                <ReceiptPage />
              </AppLayout>
            }
          />

          <Route
            path="/statistics"
            element={
              <AppLayout pageTitle="统计分析">
                <StatisticsPage />
              </AppLayout>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/purchase" element={<Navigate to="/purchase/list" replace />} />
          <Route
            path="*"
            element={
              <AppLayout pageTitle="页面未找到">
                <div className="flex h-full items-center justify-center py-20">
                  <div className="text-center">
                    <p className="text-7xl font-bold text-slate-200">404</p>
                    <p className="mt-4 text-lg text-slate-500">您访问的页面不存在</p>
                  </div>
                </div>
              </AppLayout>
            }
          />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
