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
    <div className="h-full flex flex-col">
      <table className="w-full text-sm flex-1">
        <thead>
          <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-parch">
            <th className="pb-2">#</th>
            <th className="pb-2">Product</th>
            <th className="pb-2 text-right">Units</th>
            <th className="pb-2 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="h-full">
          {products.map((p, idx) => (
            <tr key={p.product_id || idx} className="border-b border-parch last:border-0" style={{ height: `${100 / products.length}%` }}>
              <td className="py-2 text-muted font-mono text-xs">#{idx + 1}</td>
              <td className="py-2 font-medium text-ink truncate max-w-xs">
                {p.title?.length > 25 ? `${p.title.substring(0, 25)}…` : p.title}
              </td>
              <td className="py-2 text-right text-muted">{formatNum(p.units_sold)}</td>
              <td className="py-2 text-right font-bold text-gold">{formatINR(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
