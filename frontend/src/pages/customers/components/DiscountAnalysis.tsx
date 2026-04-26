import type { DiscountItem } from '@app/types/analytics';
import { formatINR, formatNum, formatPct } from '@utils/formatters';

interface Props { data: DiscountItem[]; loading: boolean; }

export function DiscountAnalysis({ data, loading }: Props) {
  if (loading) return <div className="h-48 bg-parch animate-pulse rounded-lg" />;
  if (!data.length) return <p className="text-muted text-sm text-center py-8">No order data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-parch">
            <th className="text-left text-xs font-medium text-muted pb-2 pr-4">Discount Code</th>
            <th className="text-right text-xs font-medium text-muted pb-2 pr-4">Orders</th>
            <th className="text-right text-xs font-medium text-muted pb-2 pr-4">% of Total</th>
            <th className="text-right text-xs font-medium text-muted pb-2 pr-4">Revenue</th>
            <th className="text-right text-xs font-medium text-muted pb-2">Avg Order</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.discount_code} className="border-b border-parch/50 hover:bg-[#FDFAF4] transition-colors">
              <td className="py-2.5 pr-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  d.discount_code === 'No Discount'
                    ? 'bg-gray-100 text-muted'
                    : 'bg-[#B8860B]/10 text-[#B8860B]'
                }`}>
                  {d.discount_code}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-right text-ink">{formatNum(d.orders)}</td>
              <td className="py-2.5 pr-4 text-right text-muted">{formatPct(d.pct_of_total)}</td>
              <td className="py-2.5 pr-4 text-right text-ink">{formatINR(d.revenue)}</td>
              <td className="py-2.5 text-right font-semibold text-ink">{formatINR(d.aov)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
