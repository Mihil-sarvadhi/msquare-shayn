import { ConnectorHealth, MetaDailyInsight } from '@db/models';
import { fetchCampaignInsights, parseActions } from './meta.connector';
import { logger } from '@logger/logger';

export async function syncMetaInsights(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const insights = await fetchCampaignInsights(sevenDaysAgo, today);
    let count = 0;

    for (const insight of insights) {
      const { purchases, purchaseValue } = parseActions(insight.actions, insight.action_values);
      const roas = parseFloat(insight.purchase_roas?.[0]?.value || '0');

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
        roas,
      });
      count++;
    }

    await ConnectorHealth.update(
      { last_sync_at: new Date(), status: 'green', records_synced: count, error_message: undefined },
      { where: { connector_name: 'meta_ads' } }
    );

    logger.info(`[Meta Ads] Synced ${count} insight rows`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'meta_ads' } }
    );
    logger.error(`[Meta Ads] Sync error: ${(err as Error).message}`);
  }
}
