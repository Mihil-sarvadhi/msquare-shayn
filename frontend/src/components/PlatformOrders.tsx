import React from 'react';
import { KPIs } from '../hooks/useDashboard';
import { formatNum } from '../utils/formatters';
import ComingSoon from './ComingSoon';

interface PlatformOrdersProps {
  kpis: KPIs | null;
}

export default function PlatformOrders({ kpis }: PlatformOrdersProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-ink">Shopify D2C</span>
        <span className="font-mono font-bold text-ink">{formatNum(kpis?.orders)}</span>
      </div>
      <ComingSoon label="Amazon" />
      <ComingSoon label="Flipkart" />
      <ComingSoon label="Myntra" />
    </div>
  );
}
