import type { TopSkuItem } from '@app/types/analytics';
import { formatINR, formatNum } from '@utils/formatters';

interface TopSkusProps {
  data: TopSkuItem[];
  loading: boolean;
}

export function TopSkus({ data, loading }: TopSkusProps) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-8">No sales data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-parch">
            <th className="pb-2 pr-3 font-medium">#</th>
            <th className="pb-2 pr-3 font-medium">SKU</th>
            <th className="pb-2 pr-3 font-medium">Product</th>
            <th className="pb-2 pr-3 font-medium text-right">Units</th>
            <th className="pb-2 pr-3 font-medium text-right">Orders</th>
            <th className="pb-2 font-medium text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={item.sku}
              className="border-b border-parch/50 last:border-0 hover:bg-parch/30 transition-colors"
            >
              <td className="py-2.5 pr-3 text-muted font-mono text-xs">{i + 1}</td>
              <td className="py-2.5 pr-3">
                <span className="font-mono text-xs bg-parch px-1.5 py-0.5 rounded text-ink">
                  {item.sku}
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <p className="font-medium text-ink leading-tight">{item.title}</p>
                {item.variant && <p className="text-xs text-muted">{item.variant}</p>}
              </td>
              <td className="py-2.5 pr-3 text-right font-semibold text-ink">
                {formatNum(item.units_sold)}
              </td>
              <td className="py-2.5 pr-3 text-right text-muted">
                {formatNum(item.orders_count)}
              </td>
              <td className="py-2.5 text-right font-bold text-gold">
                {formatINR(item.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
