import axios, { type AxiosError } from 'axios';
import { environment } from '@config/config';

const BASE = `https://graph.facebook.com/${environment.meta.apiVersion}`;
const AD_ACCOUNT = environment.meta.adAccountId;
const TOKEN = environment.meta.userToken;

const INSIGHT_FIELDS = [
  'campaign_id', 'campaign_name', 'objective',
  'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc',
  'actions', 'action_values', 'purchase_roas',
].join(',');

export interface MetaInsight {
  date_start: string; campaign_id: string; campaign_name: string; objective: string;
  spend: string; impressions: string; reach: string; clicks: string;
  ctr: string; cpm: string; cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
}

export async function fetchCampaignInsights(since: string, until: string): Promise<MetaInsight[]> {
  // Meta API requires time_range as bracket-notation params
  const params = {
    access_token: TOKEN,
    'time_range[since]': since,
    'time_range[until]': until,
    time_increment: 1,
    level: 'campaign',
    fields: INSIGHT_FIELDS,
    limit: 500,
  };

  type InsightsPage = { data: MetaInsight[]; paging?: { next?: string } };
  let allInsights: MetaInsight[] = [];
  let nextUrl: string | null = null;

  try {
    const firstRes = (await axios.get<InsightsPage>(`${BASE}/${AD_ACCOUNT}/insights`, { params })).data;
    allInsights = allInsights.concat(firstRes.data ?? []);
    nextUrl = firstRes.paging?.next ?? null;

    while (nextUrl) {
      const pageRes = (await axios.get<InsightsPage>(nextUrl)).data;
      allInsights = allInsights.concat(pageRes.data ?? []);
      nextUrl = pageRes.paging?.next ?? null;
    }
  } catch (err) {
    // Expose the actual Meta API error message, not just the status code
    const axiosErr = err as AxiosError<{ error?: { message: string; type: string; code: number } }>;
    const metaMsg = axiosErr.response?.data?.error?.message;
    throw new Error(metaMsg ?? axiosErr.message);
  }

  return allInsights;
}

export function parseActions(
  actions: Array<{ action_type: string; value: string }> = [],
  actionValues: Array<{ action_type: string; value: string }> = []
): { purchases: number; purchaseValue: number } {
  const purchases = actions.find((a) => a.action_type === 'purchase')?.value ?? '0';
  const purchaseValue = actionValues.find((a) => a.action_type === 'purchase')?.value ?? '0';
  return { purchases: parseInt(purchases, 10), purchaseValue: parseFloat(purchaseValue) };
}
