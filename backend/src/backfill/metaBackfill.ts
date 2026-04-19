import * as dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import { fetchCampaignInsights, parseActions } from '../connectors/metaAds';

function monthChunks(since: Date, until: Date): Array<{ since: string; until: string }> {
  const chunks: Array<{ since: string; until: string }> = [];
  const cur = new Date(since);
  while (cur < until) {
    const chunkStart = cur.toISOString().split('T')[0];
    cur.setMonth(cur.getMonth() + 1);
    const chunkEnd = cur > until ? until : new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() - 1);
    chunks.push({ since: chunkStart, until: chunkEnd.toISOString().split('T')[0] });
  }
  return chunks;
}

async function upsertInsights(insights: Awaited<ReturnType<typeof fetchCampaignInsights>>): Promise<number> {
  let count = 0;
  for (const insight of insights) {
    const { purchases, purchaseValue } = parseActions(insight.actions, insight.action_values);
    const roas = insight.purchase_roas?.[0]?.value || '0';
    await db.query(
      `INSERT INTO meta_daily_insights
        (date, campaign_id, campaign_name, objective, spend,
         impressions, reach, clicks, ctr, cpm, cpc, purchases, purchase_value, roas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (date, campaign_id) DO NOTHING`,
      [
        insight.date_start,
        insight.campaign_id,
        insight.campaign_name,
        insight.objective,
        parseFloat(insight.spend || '0'),
        parseInt(insight.impressions || '0', 10),
        parseInt(insight.reach || '0', 10),
        parseInt(insight.clicks || '0', 10),
        parseFloat(insight.ctr || '0'),
        parseFloat(insight.cpm || '0'),
        parseFloat(insight.cpc || '0'),
        purchases,
        purchaseValue,
        parseFloat(roas),
      ]
    );
    count++;
  }
  return count;
}

async function metaBackfill(): Promise<void> {
  const until = new Date();
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const chunks = monthChunks(since, until);
  console.log(`[Meta Backfill] Fetching ${chunks.length} monthly chunks (${since.toISOString().split('T')[0]} → ${until.toISOString().split('T')[0]})`);

  let total = 0;
  for (const chunk of chunks) {
    console.log(`[Meta Backfill] Fetching ${chunk.since} → ${chunk.until} …`);
    const insights = await fetchCampaignInsights(chunk.since, chunk.until);
    const inserted = await upsertInsights(insights);
    total += inserted;
    console.log(`  → ${inserted} rows (${insights.length} insights)`);
  }

  console.log(`[Meta Backfill] Done. Total inserted: ${total} rows.`);
  await db.end();
}

metaBackfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
