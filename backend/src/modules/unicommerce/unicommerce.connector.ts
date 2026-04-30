import axios, { AxiosError } from 'axios';
import { getValidToken, refreshToken } from './unicommerce.token';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';
import { logger } from '@logger/logger';

const UNICOMMERCE_TIMEOUT_MS = 30000;

function baseUrl(): string {
  const url = process.env.UNICOMMERCE_BASE_URL;
  if (!url) {
    throw new AppError({
      errorType: ERROR_TYPES.INTERNAL_ERROR,
      message: 'UNICOMMERCE_BASE_URL not set',
      code: 'UNICOMMERCE_CONFIG_MISSING',
    });
  }
  return url;
}

function facilityCode(): string {
  const code = process.env.UNICOMMERCE_FACILITY_CODE;
  if (!code) {
    throw new AppError({
      errorType: ERROR_TYPES.INTERNAL_ERROR,
      message: 'UNICOMMERCE_FACILITY_CODE not set',
      code: 'UNICOMMERCE_CONFIG_MISSING',
    });
  }
  return code;
}

async function buildHeaders(facilityRequired: boolean): Promise<Record<string, string>> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (facilityRequired) headers['Facility'] = facilityCode();
  return headers;
}

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  facilityRequired = true,
  retried = false,
): Promise<T> {
  try {
    const res = await axios.post<T>(`${baseUrl()}${path}`, body, {
      headers: await buildHeaders(facilityRequired),
      timeout: UNICOMMERCE_TIMEOUT_MS,
    });
    return res.data;
  } catch (err) {
    const ax = err as AxiosError;
    if (!retried && ax.response?.status === 401) {
      logger.warn('[Unicommerce] 401 from API — refreshing token and retrying once');
      await refreshToken();
      return post<T>(path, body, facilityRequired, true);
    }
    throw err;
  }
}

/* ── Response shapes ─────────────────────────────────────────────────── */

export interface UCSearchOptions {
  displayLength: number;
  displayStart: number;
}

export interface UCOrderSummary {
  code: string;
  displayOrderCode?: string;
  channel?: string;
  status?: string;
  displayOrderDateTime?: string;
  updated?: string;
  fulfillmentTat?: string;
  cod?: boolean;
  facilityCode?: string;
  onHold?: boolean;
}

export interface UCOrderSearchResponse {
  successful: boolean;
  message?: string;
  saleOrderSummaries?: UCOrderSummary[];
  elements?: UCOrderSummary[];
  totalRecords?: number;
}

export interface UCOrderItem {
  code?: string;
  itemSku?: string;
  itemName?: string;
  quantity?: number | string;
  sellingPrice?: number | string;
  discount?: number | string;
  shippingCharges?: number | string;
  cashOnDeliveryCharges?: number | string;
  totalPrice?: number | string;
  transferPrice?: number | string;
  statusCode?: string;
  channel?: string;
  returnReason?: string | null;
  returnAWBNumber?: string | null;
  facilityCode?: string;
}

export interface UCOrderPrice {
  totalPrice?: number | string;
  totalShippingCharges?: number | string;
  totalDiscount?: number | string;
  totalCashOnDeliveryCharges?: number | string;
  totalPrepaidAmount?: number | string;
}

export interface UCAddress {
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  [key: string]: unknown;
}

export interface UCPaymentDetail {
  paymentMethod?: string;
  amount?: number | string;
  transactionId?: string;
  [key: string]: unknown;
}

export interface UCOrderDTO {
  code: string;
  displayOrderCode?: string;
  channel?: string;
  status?: string;
  displayOrderDateTime?: string;
  updated?: string;
  fulfillmentTat?: string;
  cod?: boolean;
  currencyCode?: string;
  orderPrice?: UCOrderPrice;
  customerCode?: string;
  notificationEmail?: string;
  notificationMobile?: string;
  shippingAddress?: UCAddress;
  billingAddress?: UCAddress;
  paymentDetails?: UCPaymentDetail[];
  facilityCode?: string;
  thirdPartyShipping?: boolean;
  onHold?: boolean;
  saleOrderItems?: UCOrderItem[];
  [key: string]: unknown;
}

export interface UCOrderDetailResponse {
  successful: boolean;
  message?: string;
  saleOrderDTO?: UCOrderDTO;
}

export interface UCShipmentDTO {
  code?: string;
  shippingPackageCode?: string;
  saleOrderCode?: string;
  awbNumber?: string;
  awb?: string;
  courier?: string;
  shippingProvider?: string;
  statusCode?: string;
  status?: string;
  dispatchTime?: string;
  expectedDeliveryDate?: string;
  channel?: string;
  facilityCode?: string;
  weight?: number | string;
}

export interface UCShipmentSearchResponse {
  successful: boolean;
  message?: string;
  elements?: UCShipmentDTO[];
  shippingPackages?: UCShipmentDTO[];
}

export interface UCShipmentDetailResponse {
  successful: boolean;
  shippingPackageDTO?: UCShipmentDTO;
}

export interface UCReturnDTO {
  shipmentCode?: string;
  saleOrderCode?: string;
  returnAWBNumber?: string;
  reason?: string;
  statusCode?: string;
  channel?: string;
  facilityCode?: string;
  created?: string;
  completed?: string;
}

export interface UCReturnDetailResponse {
  successful: boolean;
  returnDTO?: UCReturnDTO;
}

export interface UCInventorySnapshot {
  itemSKU?: string;
  inventory?: number;
  inventoryOnHold?: number;
  inventoryDamaged?: number;
  totalInventory?: number;
  facilityCode?: string;
}

export interface UCInventorySnapshotResponse {
  successful: boolean;
  inventorySnapshots?: UCInventorySnapshot[];
}

export interface UCFacilityResponse {
  successful: boolean;
  elements?: Array<{ code?: string; name?: string }>;
}

/* ── 8 API methods ───────────────────────────────────────────────────── */

export async function searchOrders(
  fromDate: string,
  toDate: string,
  channel: string | null = null,
  start = 0,
  length = 50,
): Promise<UCOrderSearchResponse> {
  const body: Record<string, unknown> = {
    fromDate,
    toDate,
    dateType: 'CREATED',
    searchOptions: { displayLength: length, displayStart: start } satisfies UCSearchOptions,
  };
  if (channel) body.channel = channel;
  return post<UCOrderSearchResponse>('/services/rest/v1/oms/saleOrder/search', body);
}

/**
 * Look up a single sale order by its `code`. We deliberately omit
 * `facilityCodes` here so the API resolves the order across whichever
 * facility it actually belongs to — search returns codes from any
 * facility the user has access to, and constraining `get` to a single
 * facility makes legitimately-cross-facility orders 404 unnecessarily.
 */
export async function getOrderDetails(orderCode: string): Promise<UCOrderDetailResponse> {
  return post<UCOrderDetailResponse>('/services/rest/v1/oms/saleOrder/get', {
    code: orderCode,
    paymentDetailRequired: true,
  });
}

export async function searchOrderItems(
  fromDate: string,
  toDate: string,
  channel: string | null = null,
  start = 0,
  length = 50,
): Promise<UCOrderSearchResponse> {
  const body: Record<string, unknown> = {
    fromDate,
    toDate,
    dateType: 'CREATED',
    searchOptions: { displayLength: length, displayStart: start } satisfies UCSearchOptions,
  };
  if (channel) body.channel = channel;
  return post<UCOrderSearchResponse>('/services/rest/v1/oms/saleOrderItem/search', body);
}

export async function searchShipments(
  fromDate: string,
  toDate: string,
  start = 0,
  length = 50,
): Promise<UCShipmentSearchResponse> {
  return post<UCShipmentSearchResponse>('/services/rest/v1/oms/shippingPackage/search', {
    fromDate,
    toDate,
    searchOptions: { displayLength: length, displayStart: start } satisfies UCSearchOptions,
  });
}

export async function getShipmentDetails(shipmentCode: string): Promise<UCShipmentDetailResponse> {
  return post<UCShipmentDetailResponse>('/services/rest/v1/oms/shippingPackage/get', {
    code: shipmentCode,
  });
}

export async function getReturnDetails(shipmentCode: string): Promise<UCReturnDetailResponse> {
  return post<UCReturnDetailResponse>('/services/rest/v1/oms/return/get', { shipmentCode });
}

export async function getInventory(skuCodes: string[]): Promise<UCInventorySnapshotResponse> {
  return post<UCInventorySnapshotResponse>('/services/rest/v1/inventory/inventorySnapshot/get', {
    skuCodes,
    facilityCode: facilityCode(),
  });
}

export async function searchFacilities(): Promise<UCFacilityResponse> {
  return post<UCFacilityResponse>(
    '/services/rest/v1/master/facility/search',
    { facilityStatus: 'ALL' },
    false,
  );
}
