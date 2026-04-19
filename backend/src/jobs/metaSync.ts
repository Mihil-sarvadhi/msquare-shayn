import db from '../config/database';
import { fetchCampaignInsights, parseActions } from '../connectors/metaAds';

export async function syncMetaInsights(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const insights = await fetchCampaignInsights(sevenDaysAgo, today);
    let count = 0;

    for (const insight of insights) {
      const { purchases, purchaseValue } = parseActions(insight.actions, insight.action_values);
      const roas = insight.purchase_roas?.[0]?.value || '0';

      await db.query(
        `INSERT INTO meta_daily_insights
          (date, campaign_id, campaign_name, objective, spend,
           impressions, reach, clicks, ctr, cpm, cpc, purchases, purchase_value, roas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (date, campaign_id) DO UPDATE SET
           spend = EXCLUDED.spend,
           impressions = EXCLUDED.impressions,
           clicks = EXCLUDED.clicks,
           purchases = EXCLUDED.purchases,
           purchase_value = EXCLUDED.purchase_value,
           roas = EXCLUDED.roas,
           synced_at = NOW()`,
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

    await db.query(
      `UPDATE connector_health
       SET last_sync_at = NOW(), status = 'green', records_synced = $1, error_message = NULL
       WHERE connector_name = 'meta_ads'`,
      [count]
    );

    console.log(`[Meta Ads] Synced ${count} insight rows`);
  } catch (err) {
    await db.query(
      `UPDATE connector_health SET status = 'red', error_message = $1
       WHERE connector_name = 'meta_ads'`,
      [(err as Error).message]
    );
    console.error('[Meta Ads] Sync error:', (err as Error).message);
  }
}
