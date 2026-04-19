import React from 'react';
import { TopRatedProduct } from '../hooks/useDashboard';

interface Props {
  products: TopRatedProduct[];
  loading: boolean;
}

export default function TopRatedProducts({ products, loading }: Props) {
  if (loading) return <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-parch rounded" />)}</div>;
  if (!products || !products.length) return <p className="text-muted text-sm">No product data yet</p>;

  return (
    <div className="flex-1 flex flex-col justify-around">
      {products.map((p, idx) => (
        <div key={p.product_id} className="flex items-center gap-3 py-2 border-b border-parch last:border-0">
          <span className="text-xs font-mono text-muted w-4">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{p.title}</p>
            <p className="text-xs text-muted">{p.reviews_count} reviews</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 justify-end">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className={`text-xs ${s <= Math.round(p.average_rating) ? 'text-gold' : 'text-parch'}`}>★</span>
              ))}
            </div>
            <p className="text-xs font-semibold text-gold">{Number(p.average_rating).toFixed(1)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
