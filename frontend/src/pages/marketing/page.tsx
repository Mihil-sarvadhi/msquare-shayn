import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchMarketingData } from '@store/slices/analyticsSlice';
import { MarketingKPIs }   from './components/MarketingKPIs';
import { RoasTrend }       from './components/RoasTrend';
import { CppTrend }        from './components/CppTrend';
import { AttributionGap }  from './components/AttributionGap';
import { CtrTrend }        from './components/CtrTrend';
import { ChannelRevenue }  from './components/ChannelRevenue';

export function MarketingPage() {
  const dispatch = useAppDispatch();
  const { marketingTrend, attributionGap, channelRevenue, loadingMarketing } =
    useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchMarketingData(range));
  }, [dispatch, range]);

  const L = loadingMarketing;

  return (
    <div className="bg-ivory font-sans">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-10 space-y-4">

        <MarketingKPIs trend={marketingTrend} attribution={attributionGap} loading={L} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Revenue by Channel</h3>
            <ChannelRevenue data={channelRevenue} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">ROAS Trend</h3>
            <RoasTrend data={marketingTrend} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Cost Per Purchase Trend</h3>
            <CppTrend data={marketingTrend} loading={L} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Meta vs Shopify Attribution</h3>
            <AttributionGap data={attributionGap} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">CTR Trend</h3>
            <CtrTrend data={marketingTrend} loading={L} />
          </div>
        </div>

      </main>
    </div>
  );
}
