import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchCustomersData } from '@store/slices/analyticsSlice';
import { AnalyticsHeader }     from '../analytics/AnalyticsHeader';
import { CustomerOverviewRow } from './components/CustomerOverviewRow';
import { NewVsReturning }      from './components/NewVsReturning';
import { CustomerSegments }    from './components/CustomerSegments';
import { TopCustomers }        from './components/TopCustomers';
import { DiscountAnalysis }    from './components/DiscountAnalysis';

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const {
    range, customerOverview, customerSegments,
    topCustomers, discountAnalysis, loadingCustomers,
  } = useAppSelector((s) => s.analytics);

  useEffect(() => {
    dispatch(fetchCustomersData(range));
  }, [dispatch, range]);

  const L = loadingCustomers;

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <AnalyticsHeader
        title="Customers"
        subtitle="New vs returning, LTV segments, and discount impact"
      />
      <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

        <CustomerOverviewRow data={customerOverview} loading={L} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">New vs Returning</h3>
            <NewVsReturning data={customerOverview} loading={L} />
          </div>
          <div className="bg-white rounded-xl border border-parch shadow-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Customer LTV Segments</h3>
            <CustomerSegments data={customerSegments} loading={L} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Top 10 Customers</h3>
          <TopCustomers data={topCustomers} loading={L} />
        </div>

        <div className="bg-white rounded-xl border border-parch shadow-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-4">Discount Code Analysis</h3>
          <DiscountAnalysis data={discountAnalysis} loading={L} />
        </div>

      </main>
    </div>
  );
}
