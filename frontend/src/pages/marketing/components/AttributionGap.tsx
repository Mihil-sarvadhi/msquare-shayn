import type { AttributionGap as AttributionGapType } from '@app/types/analytics';
import { formatNum, formatPct } from '@utils/formatters';

interface Props { data: AttributionGapType | null; loading: boolean; }

export function AttributionGap({ data, loading }: Props) {
  if (loading || !data) return <div className="h-40 bg-parch animate-pulse rounded-lg" />;

  const over     = data.gap > 0;
  const gapLabel = Math.abs(data.gap);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-4 rounded-xl bg-[#9B2235]/5 border border-[#9B2235]/15">
          <p className="text-xs text-muted mb-1">Meta Claims</p>
          <p className="text-3xl font-bold text-[#9B2235]">{formatNum(data.meta_purchases)}</p>
          <p className="text-xs text-muted mt-1">purchases</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-[#2D7D46]/5 border border-[#2D7D46]/15">
          <p className="text-xs text-muted mb-1">Shopify Recorded</p>
          <p className="text-3xl font-bold text-[#2D7D46]">{formatNum(data.shopify_orders)}</p>
          <p className="text-xs text-muted mt-1">orders</p>
        </div>
      </div>
      <div className="text-center p-3 rounded-lg bg-[#F5F0E8]">
        <p className="text-sm text-muted">
          Attribution Rate:{' '}
          <span className="font-bold text-ink">{formatPct(data.attribution_rate)}</span>
        </p>
        <p className="text-xs text-muted mt-1">
          Meta {over ? 'over-attributes' : 'under-attributes'} by{' '}
          <span className={`font-semibold ${over ? 'text-[#9B2235]' : 'text-[#2D7D46]'}`}>
            {formatNum(gapLabel)} orders
          </span>
          {over && ' — may include view-through conversions'}
        </p>
      </div>
    </div>
  );
}
