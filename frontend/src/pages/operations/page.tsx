import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchOperationsData } from '@store/slices/analyticsSlice';
import { NetRevenueRow }      from './components/NetRevenueRow';
import { RtoByState }         from './components/RtoByState';
import { CodVsPrepaidRto }    from './components/CodVsPrepaidRto';
import { GeoRevenue }         from './components/GeoRevenue';
import { LogisticsCostDonut } from './components/LogisticsCostDonut';
import { CodCashFlow }        from './components/CodCashFlow';
import { MoneyStuck }         from './components/MoneyStuck';

export function OperationsPage() {
  const dispatch = useAppDispatch();
  const { netRevenue, rtoByState, codVsPrepaidRto, geoRevenue, logisticsCosts, codCashFlow, moneyStuck, loadingOperations } =
    useAppSelector((s) => s.analytics);
  const range = useAppSelector((s) => s.range);

  useEffect(() => {
    dispatch(fetchOperationsData(range));
  }, [dispatch, range]);

  const L = loadingOperations;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-10 space-y-4">

        <NetRevenueRow data={netRevenue} loading={L} />

        <div className="bg-white rounded-xl border border-ruby/20 shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ruby mb-4 flex items-center gap-1.5">
            <span>⚠</span> Where Your Money Is Getting Stuck
          </h3>
          <MoneyStuck data={moneyStuck} loading={L} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">RTO by State</h3>
            <RtoByState data={rtoByState} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">COD vs Prepaid RTO</h3>
            <CodVsPrepaidRto data={codVsPrepaidRto} loading={L} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Revenue by State (Top 10)</h3>
            <GeoRevenue data={geoRevenue} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Shipment Status Breakdown</h3>
            <LogisticsCostDonut data={logisticsCosts} loading={L} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">
            COD Cash Flow ({range.preset === '7d' ? 'Last 7 Days' : range.preset === '30d' ? 'Last 30 Days' : `${range.startDate} → ${range.endDate}`})
          </h3>
          <CodCashFlow data={codCashFlow} loading={L} />
        </div>

      </main>
    </div>
  );
}
