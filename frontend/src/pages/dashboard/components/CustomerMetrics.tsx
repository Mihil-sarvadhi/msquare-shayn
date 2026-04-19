import { KPIs } from '@app/types/dashboard';
import { formatNum } from '@utils/formatters';

interface CustomerMetricsProps {
  kpis: KPIs | null;
}

export default function CustomerMetrics({ kpis }: CustomerMetricsProps) {
  if (!kpis) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-sm text-muted">Total Customers</span>
        <span className="font-mono font-bold text-ink">{formatNum(kpis.customers)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-muted">COD Orders</span>
        <span className="font-mono font-bold text-amber">{formatNum(kpis.codOrders)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-muted">Prepaid Orders</span>
        <span className="font-mono font-bold text-emerald">{formatNum(kpis.prepaidOrders)}</span>
      </div>
    </div>
  );
}
