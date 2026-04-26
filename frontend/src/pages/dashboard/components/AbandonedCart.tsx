import { AbandonedCarts } from '@app/types/dashboard';
import { formatNum, formatINR } from '@utils/formatters';

interface AbandonedCartProps {
  data: AbandonedCarts | null;
  loading: boolean;
}

export default function AbandonedCart({ data, loading }: AbandonedCartProps) {
  if (loading) return <div className="h-24 bg-parch animate-pulse rounded-lg" />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-sm text-muted">Abandoned Carts</span>
        <span className="font-mono font-bold text-ruby">{formatNum(data.count)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-muted">Cart Value Lost</span>
        <span className="font-mono font-bold text-ink">{formatINR(data.total_value)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-muted">Avg Cart Value</span>
        <span className="font-mono font-bold text-muted">{formatINR(data.avg_value)}</span>
      </div>
    </div>
  );
}
