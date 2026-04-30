import { syncOrders, aggregateChannelDaily } from './unicommerce.sync';
import { logger } from '@logger/logger';

const BACKFILL_START = '2023-01-01';
const MONTH_GAP_MS = 2000;

interface MonthRange {
  fromIso: string;
  toIso: string;
  label: string;
}

function buildMonthRanges(startYmd: string, end: Date): MonthRange[] {
  const ranges: MonthRange[] = [];
  const cursor = new Date(`${startYmd}T00:00:00.000Z`);

  while (cursor <= end) {
    const monthStart = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1, 0, 0, 0),
    );
    const monthEnd = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59),
    );
    const effectiveEnd = monthEnd < end ? monthEnd : end;

    ranges.push({
      fromIso: monthStart.toISOString(),
      toIso: effectiveEnd.toISOString(),
      label: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`,
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    cursor.setUTCDate(1);
  }

  return ranges;
}

export async function unicommerceBackfill(): Promise<void> {
  const start = process.env.UNICOMMERCE_BACKFILL_START || BACKFILL_START;
  const end = new Date();
  const ranges = buildMonthRanges(start, end);

  logger.info(
    `[Unicommerce Backfill] Starting from ${start} → ${end.toISOString().slice(0, 10)} (${ranges.length} months)`,
  );

  let grandTotal = 0;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const monthStartedAt = Date.now();
    logger.info(`[Unicommerce Backfill] ═══ Month ${i + 1}/${ranges.length}: ${range.label} ═══`);
    try {
      const count = await syncOrders(range.fromIso, range.toIso);
      await aggregateChannelDaily(range.fromIso.slice(0, 10), range.toIso.slice(0, 10));
      grandTotal += count;
      const elapsedS = Math.round((Date.now() - monthStartedAt) / 1000);
      logger.info(
        `[Unicommerce Backfill] ═══ ${range.label} done: ${count} orders in ${elapsedS}s ` +
          `(running total: ${grandTotal}) ═══`,
      );
    } catch (err) {
      logger.error(`[Unicommerce Backfill] ${range.label} failed: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, MONTH_GAP_MS));
  }

  logger.info(`[Unicommerce Backfill] All months processed. Total: ${grandTotal} orders`);
}

if (require.main === module) {
  unicommerceBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`[Unicommerce Backfill] Fatal: ${(err as Error).message}`);
      process.exit(1);
    });
}
