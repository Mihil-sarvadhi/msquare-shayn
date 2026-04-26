import axios from 'axios';

const BASE = `https://graph.facebook.com/${process.env.META_API_VERSION}`;
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID as string;
const TOKEN = process.env.META_USER_TOKEN as string;

const INSIGHT_FIELDS = [
  'campaign_id',
  'campaign_name',
  'objective',
  'spend',
  'impressions',
  'reach',
  'clicks',
  'ctr',
  'cpm',
  'cpc',
  'actions',
  'action_values',
  'purchase_roas',
].join(',');

export interface MetaInsight {
  date_start: string;
  campaign_id: string;
  campaign_name: string;
  objective: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpm: string;
  cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
}

export async function fetchCampaignInsights(since: string, until: string): Promise<MetaInsight[]> {
  const params = {
    access_token: TOKEN,
    time_range: JSON.stringify({ since, until }),
    time_increment: 1,
    level: 'campaign',
    fields: INSIGHT_FIELDS,
    limit: 500,
  };

  type InsightsPage = { data: MetaInsight[]; paging?: { next?: string } };
  let allInsights: MetaInsight[] = [];
  let nextUrl: string | null = null;
  const firstRes: InsightsPage = (await axios.get(`${BASE}/${AD_ACCOUNT}/insights`, { params }))
    .data as InsightsPage;
  allInsights = allInsights.concat(firstRes.data);
  nextUrl = firstRes.paging?.next || null;

  while (nextUrl) {
    const pageRes: InsightsPage = (await axios.get(nextUrl)).data as InsightsPage;
    allInsights = allInsights.concat(pageRes.data);
    nextUrl = pageRes.paging?.next || null;
  }
  return allInsights;
}

export async function startAsyncInsightsJob(since: string, until: string): Promise<string> {
  const res = await axios.post(`${BASE}/${AD_ACCOUNT}/insights`, null, {
    params: {
      access_token: TOKEN,
      time_range: JSON.stringify({ since, until }),
      time_increment: 1,
      level: 'campaign',
      fields: INSIGHT_FIELDS,
    },
  });
  return res.data.report_run_id as string;
}

export async function checkAsyncJobStatus(
  reportRunId: string,
): Promise<{ id: string; async_status: string; async_percent_completion: number }> {
  const res = await axios.get(`${BASE}/${reportRunId}`, {
    params: { access_token: TOKEN },
  });
  return res.data;
}

export async function fetchAsyncJobResults(reportRunId: string): Promise<MetaInsight[]> {
  const res = await axios.get(`${BASE}/${reportRunId}/insights`, {
    params: { access_token: TOKEN, limit: 500 },
  });
  return res.data.data as MetaInsight[];
}

export function parseActions(
  actions: Array<{ action_type: string; value: string }> = [],
  actionValues: Array<{ action_type: string; value: string }> = [],
): { purchases: number; purchaseValue: number } {
  const purchases = actions.find((a) => a.action_type === 'purchase')?.value || '0';
  const purchaseValue = actionValues.find((a) => a.action_type === 'purchase')?.value || '0';
  return { purchases: parseInt(purchases, 10), purchaseValue: parseFloat(purchaseValue) };
}
