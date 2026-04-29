import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  fetchCatalogOverview,
  fetchInventory,
  fetchProducts,
  setInventoryPage,
  setInventoryThreshold,
  setProductsPage,
} from '@store/slices/catalogSlice';
import { KpiCard } from '@components/shared/KpiCard';
import { Panel } from '@components/shared/Panel';
import { PageLoader } from '@components/shared/PageLoader';
import { formatINR, formatNum } from '@utils/formatters';
import { rangeLabel } from '@utils/common-functions/buildRangeParams';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Tab = 'products' | 'inventory' | 'performance';

function fmtAxisINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

/* ─────────────────── Products Tab ─────────────────── */
function ProductsTab() {
  const dispatch = useAppDispatch();
  const {
    products,
    productsPagination,
    loadingProducts,
    productsPage,
    productsLimit,
    productsSearch,
  } = useAppSelector((s) => s.catalog);
  const totalPages = productsPagination ? Math.ceil(productsPagination.total / productsLimit) : 1;
  return (
    <div className="space-y-3">
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Title
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Vendor
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Type
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Status
              </th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">
                Variants
              </th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">
                Total Stock
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingProducts && products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                  No products. Run backfill: POST /api/sync/shopify/backfill?resource=products
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.title ?? ''}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <span className="font-medium truncate max-w-[280px]">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-[var(--text-muted)] text-xs">{p.vendor ?? '-'}</td>
                  <td className="p-2.5 text-[var(--text-muted)] text-xs">{p.product_type ?? '-'}</td>
                  <td className="p-2.5">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        p.status === 'active'
                          ? 'bg-[var(--pos-soft)] text-[var(--pos)]'
                          : p.status === 'archived'
                            ? 'bg-[var(--neg-soft)] text-[var(--neg)]'
                            : 'bg-[var(--bg)] text-[var(--text-muted)]',
                      )}
                    >
                      {p.status ?? 'unknown'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right tabular-nums">{p.total_variants}</td>
                  <td className="p-2.5 text-right tabular-nums font-semibold">
                    {formatNum(p.total_inventory)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {productsPagination && productsPagination.total > productsLimit && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            Page {productsPage} of {totalPages} · {formatNum(productsPagination.total)} total ·
            search "{productsSearch}"
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch(setProductsPage(Math.max(1, productsPage - 1)))}
              disabled={productsPage === 1}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => dispatch(setProductsPage(Math.min(totalPages, productsPage + 1)))}
              disabled={productsPage >= totalPages}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Inventory Tab ─────────────────── */
function InventoryTab() {
  const dispatch = useAppDispatch();
  const {
    inventory,
    inventoryPagination,
    loadingInventory,
    inventoryPage,
    inventoryLimit,
    inventoryThreshold,
  } = useAppSelector((s) => s.catalog);
  const totalPages = inventoryPagination
    ? Math.ceil(inventoryPagination.total / inventoryLimit)
    : 1;
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
          Filter:
        </label>
        <button
          type="button"
          onClick={() =>
            dispatch(setInventoryThreshold(inventoryThreshold === 5 ? null : 5))
          }
          className={cn(
            'text-xs px-3 py-1 rounded-full border',
            inventoryThreshold === 5
              ? 'bg-[var(--neg-soft)] border-[var(--neg)] text-[var(--neg)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg)]',
          )}
        >
          Low Stock (≤5)
        </button>
        <button
          type="button"
          onClick={() =>
            dispatch(setInventoryThreshold(inventoryThreshold === 0 ? null : 0))
          }
          className={cn(
            'text-xs px-3 py-1 rounded-full border',
            inventoryThreshold === 0
              ? 'bg-[var(--neg-soft)] border-[var(--neg)] text-[var(--neg)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg)]',
          )}
        >
          Stockouts (=0)
        </button>
      </div>
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg)]">
            <tr>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                SKU
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Product / Variant
              </th>
              <th className="text-left p-2.5 text-xs font-semibold uppercase tracking-wide">
                Per Location
              </th>
              <th className="text-right p-2.5 text-xs font-semibold uppercase tracking-wide">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingInventory && inventory.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[var(--text-muted)]">
                  Loading...
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[var(--text-muted)]">
                  No inventory data.
                </td>
              </tr>
            ) : (
              inventory.map((row) => (
                <tr
                  key={row.variant_id}
                  className="border-t border-[var(--border)] hover:bg-[var(--bg)]"
                >
                  <td className="p-2.5 font-mono text-xs">{row.sku ?? '-'}</td>
                  <td className="p-2.5">
                    <div className="font-medium">{row.product_title}</div>
                    <div className="text-[var(--text-muted)] text-xs">{row.variant_title}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {row.per_location.map((p) => (
                        <span
                          key={p.location_id}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded border tabular-nums',
                            p.available <= 0
                              ? 'border-[var(--neg)] text-[var(--neg)] bg-[var(--neg-soft)]'
                              : p.available <= 5
                                ? 'border-[var(--warn)] text-[var(--warn)]'
                                : 'border-[var(--border)] text-[var(--text-muted)]',
                          )}
                        >
                          {p.location_name ?? '?'}: {p.available}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    className={cn(
                      'p-2.5 text-right tabular-nums font-semibold',
                      row.total_available <= 0 ? 'text-[var(--neg)]' : '',
                    )}
                  >
                    {row.total_available}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {inventoryPagination && inventoryPagination.total > inventoryLimit && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            Page {inventoryPage} of {totalPages} · {formatNum(inventoryPagination.total)} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch(setInventoryPage(Math.max(1, inventoryPage - 1)))}
              disabled={inventoryPage === 1}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => dispatch(setInventoryPage(Math.min(totalPages, inventoryPage + 1)))}
              disabled={inventoryPage >= totalPages}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-50 hover:bg-[var(--bg)]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Performance Tab ─────────────────── */
function PerformanceTab() {
  const { bestSellers, slowMovers, margin } = useAppSelector((s) => s.catalog);
  return (
    <div className="space-y-4">
      <Panel title="Best Sellers" subtitle="Shopify · Top 20 by units sold in current range">
        {bestSellers.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-muted)]">
            No sales data for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bestSellers.slice(0, 20)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" fontSize={11} />
              <YAxis
                dataKey="sku"
                type="category"
                fontSize={10}
                width={100}
                tickFormatter={(v) => v ?? '-'}
              />
              <Tooltip formatter={(v: number) => formatNum(v)} />
              <Bar dataKey="units_sold" fill="var(--accent)" name="Units Sold" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Slow Movers" subtitle="Shopify · Active SKUs with stock but no recent sales">
          {slowMovers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No slow movers detected.</p>
          ) : (
            <div className="border border-[var(--border)] rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg)]">
                  <tr>
                    <th className="text-left p-2 text-xs font-semibold">SKU</th>
                    <th className="text-left p-2 text-xs font-semibold">Product</th>
                    <th className="text-right p-2 text-xs font-semibold">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {slowMovers.slice(0, 10).map((s) => (
                    <tr key={s.source_variant_id} className="border-t border-[var(--border)]">
                      <td className="p-2 font-mono text-xs">{s.sku ?? '-'}</td>
                      <td className="p-2 truncate max-w-[200px]">{s.product_title}</td>
                      <td className="p-2 text-right tabular-nums">{s.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Gross Margin" subtitle="Shopify · Per SKU · N/A when COGS is missing">
          {margin.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No data.</p>
          ) : (
            <div className="border border-[var(--border)] rounded overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg)] sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-xs font-semibold">SKU</th>
                    <th className="text-right p-2 text-xs font-semibold">Price</th>
                    <th className="text-right p-2 text-xs font-semibold">Cost</th>
                    <th className="text-right p-2 text-xs font-semibold">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {margin.slice(0, 100).map((m) => (
                    <tr key={m.source_variant_id} className="border-t border-[var(--border)]">
                      <td className="p-2 font-mono text-xs">{m.sku ?? '-'}</td>
                      <td className="p-2 text-right tabular-nums">{formatINR(m.price ?? 0)}</td>
                      <td className="p-2 text-right tabular-nums">
                        {m.cost === null ? (
                          <span className="text-[var(--text-subtle)]">N/A</span>
                        ) : (
                          formatINR(m.cost)
                        )}
                      </td>
                      <td className="p-2 text-right tabular-nums font-semibold">
                        {m.margin_pct === null ? (
                          <span className="text-[var(--text-subtle)]">N/A</span>
                        ) : (
                          <span
                            className={
                              m.margin_pct >= 50
                                ? 'text-[var(--pos)]'
                                : m.margin_pct >= 20
                                  ? 'text-[var(--text)]'
                                  : 'text-[var(--neg)]'
                            }
                          >
                            {m.margin_pct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ─────────────────── PAGE ─────────────────── */
export function CatalogPage() {
  const dispatch = useAppDispatch();
  const range = useAppSelector((s) => s.range);
  const catalog = useAppSelector((s) => s.catalog);
  const [tab, setTab] = useState<Tab>('products');

  // Use a local non-empty const to avoid unused-variable lint when fmtAxisINR isn't called.
  void fmtAxisINR;

  useEffect(() => {
    dispatch(fetchCatalogOverview(range));
  }, [dispatch, range]);

  useEffect(() => {
    dispatch(
      fetchProducts({
        page: catalog.productsPage,
        limit: catalog.productsLimit,
        search: catalog.productsSearch || undefined,
      }),
    );
  }, [dispatch, catalog.productsPage, catalog.productsLimit, catalog.productsSearch]);

  useEffect(() => {
    dispatch(
      fetchInventory({
        page: catalog.inventoryPage,
        limit: catalog.inventoryLimit,
        search: catalog.inventorySearch || undefined,
        threshold: catalog.inventoryThreshold ?? undefined,
      }),
    );
  }, [
    dispatch,
    catalog.inventoryPage,
    catalog.inventoryLimit,
    catalog.inventorySearch,
    catalog.inventoryThreshold,
  ]);

  if (catalog.error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--red-soft)] p-8 text-center max-w-md">
          <p className="text-[var(--red)] font-semibold mb-2">Connection Error</p>
          <p className="text-[var(--muted)] text-sm">{catalog.error}</p>
        </div>
      </div>
    );
  }

  const showPageLoader = catalog.loading && !catalog.kpis;
  const k = catalog.kpis;

  return (
    <>
      {showPageLoader && <PageLoader overlay />}
      <div className="bg-[var(--bg)]">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[18px] font-semibold tracking-tightish text-[var(--ink)] leading-[1.25]">Catalog &amp; Inventory</h1>
              <p className="text-[11.5px] text-[var(--muted)] mt-0.5">
                {rangeLabel(range)} · Products, stock, margin
              </p>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Active SKUs"
              value={formatNum(k?.active_skus)}
              sub="cumulative · catalog growth"
              trend={k?.active_skus_daily}
              loading={catalog.loading}
            />
            <KpiCard
              label="Stockouts"
              labelTooltip="Variants with available ≤ 0 (current state — no daily history without inventory snapshots)"
              value={formatNum(k?.stockouts)}
              sub="point-in-time"
              loading={catalog.loading}
            />
            <KpiCard
              label="Avg Margin %"
              labelTooltip="Average gross margin across SKUs with COGS set in Shopify"
              value={k?.avg_margin_pct === null || k?.avg_margin_pct === undefined ? 'N/A' : `${k.avg_margin_pct.toFixed(1)}%`}
              sub={k?.avg_margin_pct === null || k?.avg_margin_pct === undefined
                ? 'No COGS set in Shopify'
                : 'point-in-time'}
              loading={catalog.loading}
            />
            <KpiCard
              label="Inventory Value"
              labelTooltip="Sum of available × cost across all variants"
              value={formatINR(k?.total_inventory_value)}
              sub={(k?.total_inventory_value ?? 0) === 0
                ? 'No COGS set in Shopify'
                : 'point-in-time'}
              loading={catalog.loading}
            />
          </div>

          {/* Tabs */}
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <div className="flex border-b border-[var(--border)]">
              {(['products', 'inventory', 'performance'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-5 py-3 text-sm font-medium capitalize transition-colors',
                    tab === t
                      ? 'border-b-2 border-[var(--accent)] text-[var(--ink)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === 'products' && <ProductsTab />}
              {tab === 'inventory' && <InventoryTab />}
              {tab === 'performance' && <PerformanceTab />}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
