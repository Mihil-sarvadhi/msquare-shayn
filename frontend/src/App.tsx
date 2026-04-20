import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';

const DashboardPage  = lazy(() => import('@pages/dashboard/page').then((m) => ({ default: m.DashboardPage })));
const ReviewsPage    = lazy(() => import('@pages/reviews/page').then((m) => ({ default: m.ReviewsPage })));
const OperationsPage = lazy(() => import('@pages/operations/page').then((m) => ({ default: m.OperationsPage })));
const CustomersPage  = lazy(() => import('@pages/customers/page').then((m) => ({ default: m.CustomersPage })));
const MarketingPage  = lazy(() => import('@pages/marketing/page').then((m) => ({ default: m.MarketingPage })));

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/reviews"    element={<ReviewsPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/customers"  element={<CustomersPage />} />
          <Route path="/marketing"  element={<MarketingPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
