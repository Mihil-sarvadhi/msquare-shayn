import axios from 'axios';
import { environment } from '@config/config';
import { logger } from '@logger/logger';

const MY_BASE = environment.ithink.baseUrl; // https://my.ithinklogistics.com
const API_BASE = 'https://api.ithinklogistics.com'; // tracking only

const AUTH = {
  access_token: environment.ithink.accessToken,
  secret_key: environment.ithink.secretKey,
};

async function postTo<T>(
  baseUrl: string,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  const delays = [1000, 3000, 9000];
  let lastErr: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const res = await axios.post<T>(
        `${baseUrl}${endpoint}`,
        { data: { ...AUTH, ...payload } },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
      );
      logger.info(`[iThink] ${endpoint} | status=${res.status} | ${Date.now() - start}ms`);
      return res.data;
    } catch (err) {
      lastErr = err as Error;
      if (attempt < 3) {
        logger.info(`[iThink] ${endpoint} retry ${attempt + 1} in ${delays[attempt]}ms`);
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw lastErr;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface StoreOrderItem {
  awb_no: string;
  order_id: string;
  order_number: string;
  order_date: string;
  logistic: string;
  weight: string;
  payment_mode: string;
  customer_city: string;
  customer_state: string;
  customer_pincode: string;
  billing_fwd_charges: string;
  billing_rto_charges: string;
  billing_cod_charges: string;
  billing_gst_charges: string;
  billed_total_charges: string;
}

export interface StoreOrderResponse {
  status: string;
  message?: string;
  data?: Record<string, StoreOrderItem | null>;
}

export interface TrackScanDetail {
  date: string;
  time: string;
  activity: string;
  location: string;
}

export interface TrackResult {
  current_status: string;
  current_status_code: string;
  logistic: string;
  ofd_count: string;
  expected_delivery_date?: string;
  last_scan_details?: string;
  order_date_time?: { delivery_date?: string; rto_delivered_date?: string };
  scan_details?: TrackScanDetail[];
}

export interface TrackResponse {
  status?: string;
  data?: Record<string, TrackResult | { message: string }>;
}

export interface RemittanceSummary {
  cod_generated: string;
  bill_adjusted: string;
  refund_adjusted?: string;
  transaction_charges: string;
  transaction_gst_charges: string;
  wallet_amount: string;
  advance_hold: string;
  cod_remitted: string;
}

export interface RemittanceResponse {
  status: string;
  data?: RemittanceSummary[];
}

export interface RemittanceDetailItem {
  airway_bill_no: string;
  order_no: string;
  price: string;
  delivered_date: string;
}

export interface RemittanceDetailResponse {
  status: string;
  data?: RemittanceDetailItem[];
}

export interface PincodeCheckResponse {
  status: string;
  data?: unknown;
  message?: string;
}

// ── Endpoint 1: Store Order Details ───────────────────────────────────────

export async function getStoreOrderDetails(numericOrderIds: string[]): Promise<StoreOrderResponse> {
  return postTo<StoreOrderResponse>(MY_BASE, '/api_v3/store/get-order-details.json', {
    order_no_list: numericOrderIds.join(','),
    platform_id: environment.ithink.platformId,
  });
}

// ── Endpoint 2: Track AWBs (uses api.ithinklogistics.com, max 10 per call) ──

export async function trackAWBs(awbList: string[]): Promise<Record<string, TrackResult>> {
  const results: Record<string, TrackResult> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < awbList.length; i += 10) {
    chunks.push(awbList.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const res = await postTo<TrackResponse>(API_BASE, '/api_v3/order/track.json', {
      awb_number_list: chunk.join(','),
    });
    for (const [awb, data] of Object.entries(res.data ?? {})) {
      if (data && !('message' in data)) {
        results[awb] = data as TrackResult;
      }
    }
    if (chunks.length > 1) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

// ── Endpoint 3: Remittance Summary ────────────────────────────────────────

export async function getRemittanceSummary(date: string): Promise<RemittanceResponse> {
  return postTo<RemittanceResponse>(MY_BASE, '/api_v3/remittance/get.json', {
    remittance_date: date,
  });
}

// ── Endpoint 4: Remittance Details (AWB-level breakdown) ──────────────────

export async function getRemittanceDetails(date: string): Promise<RemittanceDetailResponse> {
  return postTo<RemittanceDetailResponse>(MY_BASE, '/api_v3/remittance/get_details.json', {
    remittance_date: date,
  });
}

// ── Endpoint 5: Pincode check (healthcheck / credential sanity) ────────────

export async function checkPincode(pincode = '380001'): Promise<PincodeCheckResponse> {
  return postTo<PincodeCheckResponse>(MY_BASE, '/api_v3/pincode/check.json', { pincode });
}
