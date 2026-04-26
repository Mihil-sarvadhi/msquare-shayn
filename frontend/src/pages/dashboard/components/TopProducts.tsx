import { Product } from '@app/types/dashboard';
import { formatINR, formatNum } from '@utils/formatters';

interface TopProductsProps {
  products: Product[];
  loading: boolean;
}

export default function TopProducts({ products, loading }: TopProductsProps) {
  if (loading) return <div className="h-full bg-parch animate-pulse rounded-lg" />;
  if (!products.length) return <p className="text-muted text-sm text-center py-8">No data</p>;

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[220px]">
        <thead>
          <tr className="text-left text-[10px] text-muted uppercase tracking-wide border-b border-parch">
            <th className="pb-2 pl-1 w-6">#</th>
            <th className="pb-2">Product</th>
            <th className="pb-2 text-right whitespace-nowrap">Units</th>
            <th className="pb-2 text-right whitespace-nowrap pr-1">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={p.product_id || idx} className="border-b border-parch last:border-0">
              <td className="py-2 pl-1 text-muted font-mono text-xs">#{idx + 1}</td>
              <td className="py-2 font-medium text-ink text-xs max-w-[120px] truncate">
                {p.title}
              </td>
              <td className="py-2 text-right text-muted text-xs">{formatNum(p.units_sold)}</td>
              <td className="py-2 text-right font-bold text-gold text-xs whitespace-nowrap pr-1">{formatINR(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
