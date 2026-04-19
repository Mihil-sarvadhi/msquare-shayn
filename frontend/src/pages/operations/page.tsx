import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchOperationsData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader }    from '../analytics/AnalyticsHeader';
import { NetRevenueRow }      from './components/NetRevenueRow';
import { RtoByState }         from './components/RtoByState';
import { CodVsPrepaidRto }    from './components/CodVsPrepaidRto';
import { GeoRevenue }         from './components/GeoRevenue';
import { LogisticsCostDonut } from './components/LogisticsCostDonut';
import { CodCashFlow }        from './components/CodCashFlow';

export function OperationsPage() {
  const dispatch = useAppDispatch();
  const {
    range, netRevenue, rtoByState, codVsPrepaidRto,
    geoRevenue, logisticsCosts, codCashFlow, loadingOperations,
  } = useAppSelector((s) => s.analytics);

  useEffect(() => {
    dispatch(fetchOperationsData(range));
  }, [dispatch, range]);

  const L = loadingOperations;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <AnalyticsHeader
        title="Operations"
        subtitle="Logistics costs, RTO analysis, and COD cash flow"
      />
      <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

        <NetRevenueRow data={netRevenue} loading={L} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">RTO by State</h3>
            <RtoByState data={rtoByState} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">COD vs Prepaid RTO</h3>
            <CodVsPrepaidRto data={codVsPrepaidRto} loading={L} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Revenue by State (Top 10)</h3>
            <GeoRevenue data={geoRevenue} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Logistics Cost Breakdown</h3>
            <LogisticsCostDonut data={logisticsCosts} loading={L} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">COD Cash Flow (Last 30 Days)</h3>
          <CodCashFlow data={codCashFlow} loading={L} />
        </div>

      </main>
    </div>
  );
}
