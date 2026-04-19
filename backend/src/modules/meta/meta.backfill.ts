import { MetaDailyInsight } from '@db/models';
import { fetchCampaignInsights, parseActions } from './meta.connector';
import { logger } from '@logger/logger';

function monthChunks(since: Date, until: Date): Array<{ since: string; until: string }> {
  const chunks: Array<{ since: string; until: string }> = [];
  const cur = new Date(since);
  while (cur < until) {
    const chunkStart = cur.toISOString().split('T')[0];
    cur.setMonth(cur.getMonth() + 1);
    const chunkEnd = cur > until ? new Date(until) : new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() - 1);
    chunks.push({ since: chunkStart, until: chunkEnd.toISOString().split('T')[0] });
  }
  return chunks;
}

async function upsertInsights(insights: Awaited<ReturnType<typeof fetchCampaignInsights>>): Promise<number> {
  let count = 0;
  for (const insight of insights) {
    const { purchases, purchaseValue } = parseActions(insight.actions, insight.action_values);
    await MetaDailyInsight.upsert({
      date: insight.date_start,
      campaign_id: insight.campaign_id,
      campaign_name: insight.campaign_name,
      objective: insight.objective,
      spend: parseFloat(insight.spend || '0'),
      impressions: parseInt(insight.impressions || '0', 10),
      reach: parseInt(insight.reach || '0', 10),
      clicks: parseInt(insight.clicks || '0', 10),
      ctr: parseFloat(insight.ctr || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      purchases,
      purchase_value: purchaseValue,
      roas: parseFloat(insight.purchase_roas?.[0]?.value || '0'),
    });
    count++;
  }
  return count;
}

export async function metaBackfill(): Promise<void> {
  const until = new Date();
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const chunks = monthChunks(since, until);
  logger.info(`[Meta Backfill] Fetching ${chunks.length} monthly chunks (${since.toISOString().split('T')[0]} → ${until.toISOString().split('T')[0]})`);

  let total = 0;
  for (const chunk of chunks) {
    logger.info(`[Meta Backfill] Fetching ${chunk.since} → ${chunk.until} …`);
    const insights = await fetchCampaignInsights(chunk.since, chunk.until);
    const inserted = await upsertInsights(insights);
    total += inserted;
    logger.info(`  → ${inserted} rows`);
  }

  logger.info(`[Meta Backfill] Done. Total: ${total} rows.`);
}

if (require.main === module) {
  metaBackfill().catch((err) => { logger.error(err); process.exit(1); });
}
