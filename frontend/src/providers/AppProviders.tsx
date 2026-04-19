import { ReduxProvider } from './ReduxProvider';
import { QueryProvider } from './QueryProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>{children}</QueryProvider>
    </ReduxProvider>
  );
}
