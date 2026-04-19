import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const DashboardPage = lazy(() => import('@pages/dashboard/page').then((m) => ({ default: m.DashboardPage })));
const ReviewsPage = lazy(() => import('@pages/reviews/page').then((m) => ({ default: m.ReviewsPage })));
const AuthPage = lazy(() => import('@pages/auth/page').then((m) => ({ default: m.AuthPage })));

export const routes: RouteObject[] = [
  { path: '/login', element: <AuthPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/reviews', element: <ReviewsPage /> },
  { path: '/', element: <DashboardPage /> },
];
