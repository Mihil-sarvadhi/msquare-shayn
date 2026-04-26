import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '@components/shared/ProtectedRoute';

const DashboardPage = lazy(() => import('@pages/dashboard/page').then((m) => ({ default: m.DashboardPage })));
const ReviewsPage = lazy(() => import('@pages/reviews/page').then((m) => ({ default: m.ReviewsPage })));
const MarketingPage = lazy(() => import('@pages/marketing/page').then((m) => ({ default: m.MarketingPage })));
const CustomersPage = lazy(() => import('@pages/customers/page').then((m) => ({ default: m.CustomersPage })));
const OperationsPage = lazy(() => import('@pages/operations/page').then((m) => ({ default: m.OperationsPage })));
const FinancePage = lazy(() => import('@pages/finance/page').then((m) => ({ default: m.FinancePage })));
const AuthPage = lazy(() => import('@pages/auth/page').then((m) => ({ default: m.AuthPage })));

function protect(element: React.ReactElement) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export const routes: RouteObject[] = [
  { path: '/login', element: <AuthPage /> },
  { path: '/dashboard', element: protect(<DashboardPage />) },
  { path: '/reviews', element: protect(<ReviewsPage />) },
  { path: '/marketing', element: protect(<MarketingPage />) },
  { path: '/customers', element: protect(<CustomersPage />) },
  { path: '/operations', element: protect(<OperationsPage />) },
  { path: '/finance', element: protect(<FinancePage />) },
  { path: '/', element: protect(<DashboardPage />) },
];
