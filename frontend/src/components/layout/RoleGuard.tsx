import type { ReactNode } from 'react';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MEMBER';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ children }: RoleGuardProps) {
  return <>{children}</>;
}
