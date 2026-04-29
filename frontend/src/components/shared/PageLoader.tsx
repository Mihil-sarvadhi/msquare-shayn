import { ModernLoader } from './ModernLoader';

interface PageLoaderProps {
  label?: string;
  overlay?: boolean;
}

export function PageLoader({ label = 'Loading', overlay = false }: PageLoaderProps) {
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)]/70 backdrop-blur-[1px] flex items-center justify-center">
        <ModernLoader size="lg" label={label} />
      </div>
    );
  }
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ModernLoader size="lg" label={label} />
    </div>
  );
}
