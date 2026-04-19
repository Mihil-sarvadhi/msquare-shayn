import React from 'react';
import { ReviewsSummary as ReviewsSummaryType } from '../hooks/useDashboard';

interface Props {
  data: ReviewsSummaryType | null;
  loading: boolean;
}

function StarBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-muted text-right">{label}</span>
      <div className="flex-1 bg-parch rounded-full h-1.5 overflow-hidden">
        <div className="bg-gold h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-muted">{count}</span>
    </div>
  );
}

export default function ReviewsSummary({ data, loading }: Props) {
  if (loading) return <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-parch rounded" />)}</div>;
  if (!data) return <p className="text-muted text-sm">No data</p>;

  const five = Number(data.five_star) || 0;
  const four = Number(data.four_star) || 0;
  const three = Number(data.three_star) || 0;
  const two = Number(data.two_star) || 0;
  const one = Number(data.one_star) || 0;
  const total = five + four + three + two + one || 1;
  const avgRating = total > 1
    ? (five * 5 + four * 4 + three * 3 + two * 2 + one * 1) / total
    : Number(data.store_rating) || 0;

  return (
    <div className="flex-1 flex flex-col justify-between gap-4">
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-gold">{avgRating.toFixed(1)}</span>
        <div className="pb-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`text-base ${s <= Math.round(avgRating) ? 'text-gold' : 'text-parch'}`}>★</span>
            ))}
          </div>
          <p className="text-xs text-muted">{total.toLocaleString()} reviews</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 justify-around">
        <StarBar label="5★" count={five} total={total} />
        <StarBar label="4★" count={four} total={total} />
        <StarBar label="3★" count={three} total={total} />
        <StarBar label="2★" count={two} total={total} />
        <StarBar label="1★" count={one} total={total} />
      </div>

      <div className="flex gap-4 pt-1 border-t border-parch text-xs text-muted">
        <span><span className="font-medium text-ink">{Number(data.verified_count) || 0}</span> verified</span>
        <span><span className="font-medium text-ink">{Number(data.with_photos) || 0}</span> with photos</span>
      </div>
    </div>
  );
}
