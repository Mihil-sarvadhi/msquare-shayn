import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchMe } from '@store/slices/authSlice';

interface Props { children: ReactNode }

export function ProtectedRoute({ children }: Props) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, initialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!initialized) {
      dispatch(fetchMe());
    }
  }, [dispatch, initialized]);

  // Wait until session check is complete before making any routing decision
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
