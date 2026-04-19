import axios from 'axios';
import { environment } from '@config/config';

const BASE = environment.ithink.baseUrl;
const AUTH = { access_token: environment.ithink.accessToken, secret_key: environment.ithink.secretKey };

async function post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const res = await axios.post<T>(`${BASE}${endpoint}`, { data: { ...AUTH, ...data } }, { headers: { 'Content-Type': 'application/json' } });
  return res.data;
}

export interface IthinkOrderResponse { status: string; data?: Record<string, IthinkOrder>; }
export interface IthinkOrder {
  order: string; order_date: string; logistic: string; billing_zone: string; payment_mode: string;
  latest_courier_status: string; billing_fwd_charges: string; billing_rto_charges: string;
  billing_cod_charges: string; billing_gst_charges: string; billed_total_charges: string;
  remittance_amount: string; ofd_count: string; expected_delivery_date: string;
  customer_state: string; customer_city: string; customer_pincode: string;
}
export interface IthinkTrackingResponse {
  message: string; current_status: string; current_status_code: string; ofd_count: string;
  order_date_time?: { delivery_date?: string; rto_delivered_date?: string };
}
export interface IthinkRemittanceResponse {
  status: string;
  data?: Array<{ cod_generated: string; bill_adjusted: string; transaction_charges: string; transaction_gst_charges: string; wallet_amount: string; advance_hold: string; cod_remitted: string }>;
}

export async function getOrderDetails(startDate: string, endDate: string): Promise<IthinkOrderResponse> {
  return post<IthinkOrderResponse>('/api_v3/order/get_details.json', { awb_number_list: '', start_date: startDate, end_date: endDate });
}

export async function trackOrders(awbList: string[]): Promise<Record<string, IthinkTrackingResponse>> {
  const results: Record<string, IthinkTrackingResponse> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < awbList.length; i += 10) chunks.push(awbList.slice(i, i + 10));
  for (const chunk of chunks) {
    const res = await post<{ data?: Record<string, IthinkTrackingResponse> }>('/api_v3/order/track.json', { awb_number_list: chunk.join(',') });
    Object.assign(results, res.data || {});
    await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}

export async function getRemittance(date: string): Promise<IthinkRemittanceResponse> {
  return post<IthinkRemittanceResponse>('/api_v3/remittance/get.json', { remittance_date: date });
}
