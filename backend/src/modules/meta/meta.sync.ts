import { QueryTypes } from 'sequelize';
import { sequelize } from '@db/sequelize';
import { ConnectorHealth } from '@db/models';
import { fetchCampaignInsights, parseActions } from './meta.connector';
import { logger } from '@logger/logger';

export async function syncMetaInsights(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const insights = await fetchCampaignInsights(thirtyDaysAgo, today);
    let count = 0;

    for (const insight of insights) {
      const { purchases, purchaseValue } = parseActions(insight.actions, insight.action_values);
      const roas = parseFloat(insight.purchase_roas?.[0]?.value || '0');

      try {
        await sequelize.query(
          `INSERT INTO meta_daily_insights
             (date, campaign_id, campaign_name, objective, spend, impressions, reach, clicks, ctr, cpm, cpc, purchases, purchase_value, roas, synced_at)
           VALUES
             (:date, :campaign_id, :campaign_name, :objective, :spend, :impressions, :reach, :clicks, :ctr, :cpm, :cpc, :purchases, :purchase_value, :roas, NOW())
           ON CONFLICT (date, campaign_id) DO UPDATE SET
             campaign_name   = EXCLUDED.campaign_name,
             objective       = EXCLUDED.objective,
             spend           = EXCLUDED.spend,
             impressions     = EXCLUDED.impressions,
             reach           = EXCLUDED.reach,
             clicks          = EXCLUDED.clicks,
             ctr             = EXCLUDED.ctr,
             cpm             = EXCLUDED.cpm,
             cpc             = EXCLUDED.cpc,
             purchases       = EXCLUDED.purchases,
             purchase_value  = EXCLUDED.purchase_value,
             roas            = EXCLUDED.roas,
             synced_at       = NOW()`,
          {
            type: QueryTypes.INSERT,
            replacements: {
              date: insight.date_start,
              campaign_id: insight.campaign_id,
              campaign_name: insight.campaign_name,
              objective: insight.objective ?? null,
              spend: parseFloat(insight.spend || '0'),
              impressions: parseInt(insight.impressions || '0', 10),
              reach: parseInt(insight.reach || '0', 10),
              clicks: parseInt(insight.clicks || '0', 10),
              ctr: Math.min(parseFloat(insight.ctr || '0'), 9999.9999),
              cpm: parseFloat(insight.cpm || '0'),
              cpc: parseFloat(insight.cpc || '0'),
              purchases,
              purchase_value: purchaseValue,
              roas,
            },
          },
        );
        count++;
      } catch (rowErr) {
        logger.error(
          `[Meta Ads] Row upsert failed for campaign ${insight.campaign_id} on ${insight.date_start}: ${(rowErr as Error).message}`,
        );
      }
    }

    await ConnectorHealth.update(
      {
        last_sync_at: new Date(),
        status: 'green',
        records_synced: count,
        error_message: undefined,
      },
      { where: { connector_name: 'meta_ads' } },
    );

    logger.info(`[Meta Ads] Synced ${count} insight rows`);
  } catch (err) {
    await ConnectorHealth.update(
      { status: 'red', error_message: (err as Error).message },
      { where: { connector_name: 'meta_ads' } },
    );
    logger.error(`[Meta Ads] Sync error: ${(err as Error).message}`);
  }
}
