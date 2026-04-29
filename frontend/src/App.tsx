import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';
import { ProtectedRoute } from '@components/shared/ProtectedRoute';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

const DashboardPage          = lazy(() => import('@pages/dashboard/page').then((m) => ({ default: m.DashboardPage })));
const ReviewsPage            = lazy(() => import('@pages/reviews/page').then((m) => ({ default: m.ReviewsPage })));
const OperationsPage         = lazy(() => import('@pages/operations/page').then((m) => ({ default: m.OperationsPage })));
const CustomersPage          = lazy(() => import('@pages/customers/page').then((m) => ({ default: m.CustomersPage })));
const MarketingPage          = lazy(() => import('@pages/marketing/page').then((m) => ({ default: m.MarketingPage })));
const FinancePage            = lazy(() => import('@pages/finance/page').then((m) => ({ default: m.FinancePage })));
const CatalogPage            = lazy(() => import('@pages/catalog/page').then((m) => ({ default: m.CatalogPage })));
const AuthPage               = lazy(() => import('@pages/auth/page').then((m) => ({ default: m.AuthPage })));

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <Suspense fallback={null}>
              <AuthPage />
            </Suspense>
          }
        />

        {/* Protected — wrapped in AppShell */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard"  element={<DashboardPage />} />
                    <Route path="/reviews"    element={<ReviewsPage />} />
                    <Route path="/operations" element={<OperationsPage />} />
                    <Route path="/customers"  element={<CustomersPage />} />
                    <Route path="/marketing"  element={<MarketingPage />} />
                    <Route path="/finance"    element={<FinancePage />} />
                    <Route path="/catalog"    element={<CatalogPage />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
