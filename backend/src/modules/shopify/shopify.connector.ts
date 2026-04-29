import axios from 'axios';
import { environment } from '@config/config';
import { AppError } from '@utils/appError';
import { ERROR_TYPES } from '@constant/errorTypes.constant';

const SHOPIFY_ENDPOINT = `https://${environment.shopify.storeDomain}/admin/api/${environment.shopify.apiVersion}/graphql.json`;

const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': environment.shopify.accessToken,
};

const ORDER_NODE_FIELDS = `
  id name email phone createdAt updatedAt processedAt cancelledAt cancelReason
  closed closedAt confirmed test tags note
  displayFinancialStatus displayFulfillmentStatus returnStatus
  paymentGatewayNames
  sourceName sourceIdentifier
  app { id name }
  physicalLocation { id }
  currencyCode presentmentCurrencyCode customerAcceptsMarketing
  risk { assessments { riskLevel } }
  shippingLine { title }
  totalPriceSet { shopMoney { amount currencyCode } }
  subtotalPriceSet { shopMoney { amount } }
  totalDiscountsSet { shopMoney { amount } }
  totalShippingPriceSet { shopMoney { amount } }
  totalTaxSet { shopMoney { amount } }
  totalRefundedSet { shopMoney { amount } }
  totalReceivedSet { shopMoney { amount } }
  totalOutstandingSet { shopMoney { amount } }
  currentTotalPriceSet { shopMoney { amount } }
  totalTipReceivedSet { shopMoney { amount } }
  discountCodes
  shippingAddress {
    address1 address2 city province country countryCode zip phone
  }
  billingAddress { city province country zip }
  customer { id email firstName lastName defaultAddress { city province } }
`;

const ORDERS_QUERY = `
  query GetOrders($query: String, $cursor: String) {
    orders(first: 250, query: $query, after: $cursor, sortKey: UPDATED_AT) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          ${ORDER_NODE_FIELDS}
          lineItems(first: 20) {
            edges { node {
              sku title quantity
              product { id }
              variant { id title }
              originalUnitPriceSet { shopMoney { amount } }
            }}
          }
        }
      }
    }
  }
`;

const CUSTOMERS_QUERY = `
  query GetCustomers($cursor: String) {
    customers(first: 250, after: $cursor, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          email
          firstName
          lastName
          createdAt
          defaultAddress { city province }
        }
      }
    }
  }
`;

interface MoneySet {
  shopMoney: { amount: string; currencyCode?: string };
}
interface Address {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  countryCode?: string | null;
  zip?: string | null;
  phone?: string | null;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  processedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  closed?: boolean | null;
  closedAt?: string | null;
  confirmed?: boolean | null;
  test?: boolean | null;
  tags?: string[] | null;
  note?: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  returnStatus?: string | null;
  paymentGatewayNames: string[];
  sourceName?: string | null;
  sourceIdentifier?: string | null;
  app?: { id: string; name: string } | null;
  physicalLocation?: { id: string } | null;
  currencyCode?: string | null;
  presentmentCurrencyCode?: string | null;
  customerAcceptsMarketing?: boolean | null;
  risk?: { assessments?: Array<{ riskLevel?: string | null }> } | null;
  shippingLine?: { title?: string | null } | null;
  totalPriceSet: MoneySet;
  subtotalPriceSet?: MoneySet;
  totalDiscountsSet?: MoneySet;
  totalShippingPriceSet?: MoneySet;
  totalTaxSet?: MoneySet;
  totalRefundedSet?: MoneySet;
  totalReceivedSet?: MoneySet;
  totalOutstandingSet?: MoneySet;
  currentTotalPriceSet?: MoneySet;
  totalTipReceivedSet?: MoneySet;
  discountCodes: string[];
  shippingAddress?: Address | null;
  billingAddress?: Address | null;
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    defaultAddress?: { city: string; province: string };
  };
  lineItems: {
    edges: Array<{
      node: {
        sku: string;
        title: string;
        quantity: number;
        product?: { id: string } | null;
        variant?: { id: string; title: string };
        originalUnitPriceSet: { shopMoney: { amount: string } };
      };
    }>;
  };
}

export interface ShopifyCustomer {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string | null;
  defaultAddress?: {
    city?: string | null;
    province?: string | null;
  } | null;
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await axios.post(SHOPIFY_ENDPOINT, { query, variables }, { headers });
  if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));
  return response.data.data as T;
}

export async function fetchRecentOrders(updatedAtMin?: string): Promise<ShopifyOrder[]> {
  let since = updatedAtMin;
  if (!since) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    since = d.toISOString();
  }
  const queryStr = `updated_at:>='${since}'`;
  let allOrders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  type OrdersEdge = { node: ShopifyOrder };
  type OrdersResponse = {
    orders: { edges: Array<OrdersEdge>; pageInfo: { hasNextPage: boolean; endCursor: string } };
  };
  while (hasNextPage) {
    const data: OrdersResponse = await graphqlRequest<OrdersResponse>(ORDERS_QUERY, {
      query: queryStr,
      cursor,
    });
    allOrders = allOrders.concat(data.orders.edges.map((e: OrdersEdge) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 500));
  }
  return allOrders;
}

export async function fetchCustomers(): Promise<ShopifyCustomer[]> {
  let allCustomers: ShopifyCustomer[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  type CustomersEdge = { node: ShopifyCustomer };
  type CustomersResponse = {
    customers: {
      edges: Array<CustomersEdge>;
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };

  while (hasNextPage) {
    const data: CustomersResponse = await graphqlRequest<CustomersResponse>(CUSTOMERS_QUERY, {
      cursor,
    });
    allCustomers = allCustomers.concat(data.customers.edges.map((e: CustomersEdge) => e.node));
    hasNextPage = data.customers.pageInfo.hasNextPage;
    cursor = data.customers.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 500));
  }

  return allCustomers;
}

function buildBulkOrdersQuery(): string {
  const since = environment.shopify.syncStartDate;
  return `
  mutation {
    bulkOperationRunQuery(query: """{ orders(query: "created_at:>=${since}") { edges { node {
      id name email phone createdAt updatedAt processedAt cancelledAt cancelReason
      closed closedAt confirmed test tags note
      displayFinancialStatus displayFulfillmentStatus returnStatus paymentGatewayNames
      sourceName sourceIdentifier
      app { id name }
      physicalLocation { id }
      currencyCode presentmentCurrencyCode customerAcceptsMarketing
      risk { assessments { riskLevel } }
      shippingLine { title }
      totalPriceSet { shopMoney { amount } }
      subtotalPriceSet { shopMoney { amount } }
      totalDiscountsSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      totalTaxSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      totalTipReceivedSet { shopMoney { amount } }
      discountCodes
      shippingAddress { address1 address2 city province country countryCode zip phone }
      billingAddress { city province country zip }
      customer { id email firstName lastName defaultAddress { city province } }
      lineItems { edges { node { sku title quantity product { id } originalUnitPriceSet { shopMoney { amount } } }}}
    }}}}""") { bulkOperation { id status } userErrors { field message } }
  }
`;
}

export async function startBulkBackfill(): Promise<{ id: string; status: string }> {
  const data = await graphqlRequest<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(buildBulkOrdersQuery());
  const { bulkOperation, userErrors } = data.bulkOperationRunQuery;
  if (userErrors?.length)
    throw new Error(`Shopify bulk operation error: ${userErrors.map((e) => e.message).join(', ')}`);
  if (!bulkOperation) throw new Error('Shopify returned null bulkOperation');
  return bulkOperation;
}

export async function checkBulkStatus(
  operationId: string,
): Promise<{ id: string; status: string; url?: string; errorCode?: string }> {
  const query = `query { bulkOperation(id: "${operationId}") { id status url errorCode } }`;
  const data = await graphqlRequest<{
    bulkOperation: { id: string; status: string; url?: string; errorCode?: string };
  }>(query);
  return data.bulkOperation;
}

export interface AbandonedCheckout {
  id: string;
  createdAt: string;
  abandonedCheckoutUrl: string;
  totalPriceSet: { shopMoney: { amount: string } };
  customer: { email: string } | null;
  lineItems: { edges: Array<{ node: { title: string; quantity: number } }> };
}

export async function fetchAbandonedCheckouts(): Promise<AbandonedCheckout[]> {
  const query = `query AbandonedCheckouts($cursor: String) {
    abandonedCheckouts(first: 250, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id createdAt abandonedCheckoutUrl
          totalPriceSet { shopMoney { amount } }
          customer { email }
          lineItems(first: 5) { edges { node { title quantity } } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  type Resp = {
    abandonedCheckouts: {
      edges: Array<{ node: AbandonedCheckout }>;
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  const all: AbandonedCheckout[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  // Cap at 20 pages = 5000 records to avoid runaway calls.
  for (let page = 0; page < 20 && hasNextPage; page++) {
    const data: Resp = await graphqlRequest<Resp>(query, { cursor });
    all.push(...data.abandonedCheckouts.edges.map((e) => e.node));
    hasNextPage = data.abandonedCheckouts.pageInfo.hasNextPage;
    cursor = data.abandonedCheckouts.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

/* ============================================================================
 * Phase 2 — Finance domain fetch methods
 * ========================================================================= */

export interface ShopifyLocation {
  id: string;
  name: string;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
  address: Record<string, string | null>;
}

const LOCATIONS_QUERY = `
  query Locations($cursor: String) {
    locations(first: 50, after: $cursor) {
      edges {
        cursor
        node {
          id name isActive fulfillsOnlineOrders
          address { address1 address2 city province country zip phone }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function fetchLocations(): Promise<ShopifyLocation[]> {
  const all: ShopifyLocation[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    locations: {
      edges: { node: ShopifyLocation }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(LOCATIONS_QUERY, { cursor });
    all.push(...data.locations.edges.map((e) => e.node));
    hasNextPage = data.locations.pageInfo.hasNextPage;
    cursor = data.locations.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export interface ShopifyRefundLineItem {
  quantity: number;
  restockType: string | null;
  subtotalSet: { shopMoney: { amount: string } };
  lineItem: { sku: string | null } | null;
}

export interface ShopifyRefund {
  id: string;
  createdAt: string;
  note: string | null;
  totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
  refundLineItems: { edges: { node: ShopifyRefundLineItem }[] };
}

export interface ShopifyOrderWithRefunds {
  id: string;
  refunds: ShopifyRefund[];
}

const REFUNDS_DELTA_QUERY = `
  query RefundsDelta($queryStr: String!, $cursor: String) {
    orders(first: 100, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          refunds {
            id createdAt note
            totalRefundedSet { shopMoney { amount currencyCode } }
            refundLineItems(first: 50) {
              edges { node {
                quantity restockType
                subtotalSet { shopMoney { amount } }
                lineItem { sku }
              }}
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function fetchRefundsDelta(sinceDate: Date): Promise<ShopifyOrderWithRefunds[]> {
  const sinceStr = sinceDate.toISOString().slice(0, 10);
  const queryStr = `updated_at:>=${sinceStr} financial_status:partially_refunded,refunded`;
  const all: ShopifyOrderWithRefunds[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    orders: {
      edges: { node: ShopifyOrderWithRefunds }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(REFUNDS_DELTA_QUERY, { queryStr, cursor });
    all.push(...data.orders.edges.map((e) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

/* ============================================================================
 * Shopify Returns workflow — separate from refunds. Returns are the inbound
 * "items coming back" workflow; refunds are the financial transaction. For
 * brands with high RTO, the value of returns is far larger than refunds (COD
 * orders that never paid still flow through returns). Shopify Analytics' "Returns"
 * line in the Total Sales Breakdown reflects this combined value.
 * ========================================================================= */

export interface ShopifyReturnLineItem {
  quantity: number;
  returnReason: string | null;
  // ReturnLineItemType is an interface; pricing fields live on the ReturnLineItem
  // concrete implementor and are reached via the inline fragment in the query.
  // We use `discountedUnitPriceAfterAllDiscountsSet` (line + order-level discounts)
  // because Shopify's "Returns" report subtracts ALL discounts on returned items,
  // not just line-level ones. `discountedUnitPriceSet` (the prior field) only
  // accounted for line discounts and over-counted Returns by the order-level
  // discount allocation.
  fulfillmentLineItem: {
    lineItem: {
      sku: string | null;
      discountedUnitPriceAfterAllDiscountsSet: { shopMoney: { amount: string; currencyCode: string } };
      originalUnitPriceSet: { shopMoney: { amount: string } };
    } | null;
  } | null;
}

export interface ShopifyReturnShippingFee {
  amountSet: { shopMoney: { amount: string } };
}

export interface ShopifyReturn {
  id: string;
  name: string | null;
  status: string;
  totalQuantity: number;
  createdAt: string | null;
  closedAt: string | null;
  requestApprovedAt: string | null;
  returnLineItems: { edges: { node: ShopifyReturnLineItem }[] };
  returnShippingFees: ShopifyReturnShippingFee[];
}

export interface ShopifyOrderWithReturns {
  id: string;
  returns: ShopifyReturn[];
}

// Page sizes are tuned to keep query cost under Shopify's 1000-point ceiling.
// 25 orders × 5 returns × 25 lineItems = ~625 base + nested money fields.
const RETURNS_DELTA_QUERY = `
  query ReturnsDelta($queryStr: String!, $cursor: String) {
    orders(first: 25, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          returns(first: 5) {
            edges { node {
              id name status totalQuantity createdAt closedAt requestApprovedAt
              returnLineItems(first: 25) {
                edges { node {
                  quantity returnReason
                  ... on ReturnLineItem {
                    fulfillmentLineItem {
                      lineItem {
                        sku
                        discountedUnitPriceAfterAllDiscountsSet { shopMoney { amount currencyCode } }
                        originalUnitPriceSet { shopMoney { amount } }
                      }
                    }
                  }
                }}
              }
              returnShippingFees { amountSet { shopMoney { amount } } }
            }}
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface ShopifyReturnEdgeOrder {
  id: string;
  returns: { edges: { node: ShopifyReturn }[] };
}

export async function fetchReturnsDelta(sinceDate: Date): Promise<ShopifyOrderWithReturns[]> {
  const sinceStr = sinceDate.toISOString().slice(0, 10);
  // Filter by `return_status:not NO_RETURN` so we only fetch orders that actually
  // have a return associated. This drastically reduces the page count.
  const queryStr = `updated_at:>=${sinceStr} return_status:in_progress,returned`;
  const all: ShopifyOrderWithReturns[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    orders: {
      edges: { node: ShopifyReturnEdgeOrder }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(RETURNS_DELTA_QUERY, { queryStr, cursor });
    for (const edge of data.orders.edges) {
      all.push({
        id: edge.node.id,
        returns: edge.node.returns.edges.map((e) => e.node),
      });
    }
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export interface ShopifyTransaction {
  id: string;
  kind: string;
  status: string;
  gateway: string | null;
  amountSet: { shopMoney: { amount: string; currencyCode: string } };
  processedAt: string | null;
  parentTransaction: { id: string } | null;
  paymentDetails?: { paymentMethodName?: string } | null;
}

export interface ShopifyOrderWithTransactions {
  id: string;
  transactions: ShopifyTransaction[];
}

const TRANSACTIONS_DELTA_QUERY = `
  query TxDelta($queryStr: String!, $cursor: String) {
    orders(first: 100, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id
          transactions(first: 50) {
            id kind status gateway
            amountSet { shopMoney { amount currencyCode } }
            processedAt
            parentTransaction { id }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function fetchTransactionsDelta(
  sinceDate: Date,
): Promise<ShopifyOrderWithTransactions[]> {
  const sinceStr = sinceDate.toISOString().slice(0, 10);
  const queryStr = `updated_at:>=${sinceStr}`;
  const all: ShopifyOrderWithTransactions[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    orders: {
      edges: { node: ShopifyOrderWithTransactions }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(TRANSACTIONS_DELTA_QUERY, { queryStr, cursor });
    all.push(...data.orders.edges.map((e) => e.node));
    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

/**
 * Submit a bulk operation that fetches all orders+refunds since 2023-01-01.
 * Returns the operation id; caller must poll checkBulkStatus until COMPLETED,
 * then download from the URL and parse JSONL line-by-line.
 */
export async function startRefundsBulkBackfill(): Promise<{ id: string; status: string }> {
  const bulkBody = `
    {
      orders(query: "updated_at:>=2023-01-01") {
        edges {
          node {
            id
            refunds {
              id createdAt note
              totalRefundedSet { shopMoney { amount currencyCode } }
              refundLineItems {
                edges { node {
                  quantity restockType
                  subtotalSet { shopMoney { amount } }
                  lineItem { sku }
                }}
              }
            }
          }
        }
      }
    }
  `;
  const mutation = `
    mutation {
      bulkOperationRunQuery(query: """${bulkBody}""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  const data = await graphqlRequest<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(mutation);
  const { bulkOperation, userErrors } = data.bulkOperationRunQuery;
  if (userErrors?.length)
    throw new Error(`Shopify bulk op error: ${userErrors.map((e) => e.message).join(', ')}`);
  if (!bulkOperation) throw new Error('Shopify returned null bulkOperation for refunds');
  return bulkOperation;
}

export async function startTransactionsBulkBackfill(): Promise<{ id: string; status: string }> {
  const bulkBody = `
    {
      orders(query: "updated_at:>=2023-01-01") {
        edges {
          node {
            id
            transactions(first: 50) {
              id kind status gateway
              amountSet { shopMoney { amount currencyCode } }
              processedAt
              parentTransaction { id }
            }
          }
        }
      }
    }
  `;
  const mutation = `
    mutation {
      bulkOperationRunQuery(query: """${bulkBody}""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  const data = await graphqlRequest<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(mutation);
  const { bulkOperation, userErrors } = data.bulkOperationRunQuery;
  if (userErrors?.length)
    throw new Error(`Shopify bulk op error: ${userErrors.map((e) => e.message).join(', ')}`);
  if (!bulkOperation) throw new Error('Shopify returned null bulkOperation for transactions');
  return bulkOperation;
}

/**
 * Poll currentBulkOperation until COMPLETED (or fail). Up to 30 minutes.
 * Returns the JSONL download URL.
 */
export async function waitForBulkOperationUrl(operationId: string): Promise<string> {
  for (let i = 0; i < 360; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await checkBulkStatus(operationId);
    if (status.status === 'COMPLETED') {
      if (!status.url) throw new Error('Bulk op COMPLETED but no URL');
      return status.url;
    }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(status.status)) {
      throw new Error(`Bulk op ${status.status}: ${status.errorCode ?? 'no errorCode'}`);
    }
  }
  throw new Error('Bulk op did not complete within 30 minutes');
}

/* ============================================================================
 * Phase 2 — Catalog domain fetch methods
 * ========================================================================= */

export interface ShopifyProductImage {
  url: string | null;
}

export interface ShopifyProductVariantNode {
  id: string;
  sku: string | null;
  title: string;
  price: string;
  compareAtPrice: string | null;
  barcode: string | null;
  position: number;
  inventoryItem: {
    id: string;
    tracked: boolean;
    harmonizedSystemCode: string | null;
    countryCodeOfOrigin: string | null;
    unitCost: { amount: string } | null;
    measurement: { weight: { value: number; unit: string } | null } | null;
  } | null;
}

export interface ShopifyProductNode {
  id: string;
  title: string;
  vendor: string | null;
  productType: string | null;
  status: string;
  tags: string[];
  handle: string;
  publishedAt: string | null;
  featuredImage: ShopifyProductImage | null;
  totalVariants: number;
  variants: { edges: { node: ShopifyProductVariantNode }[] };
}

const PRODUCTS_DELTA_QUERY = `
  query ProductsDelta($queryStr: String!, $cursor: String) {
    products(first: 50, after: $cursor, query: $queryStr) {
      edges {
        cursor
        node {
          id title vendor productType status tags handle publishedAt totalVariants
          featuredImage { url }
          variants(first: 100) {
            edges {
              node {
                id sku title price compareAtPrice barcode position
                inventoryItem {
                  id tracked harmonizedSystemCode countryCodeOfOrigin
                  unitCost { amount }
                  measurement { weight { value unit } }
                }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function fetchProductsDelta(sinceDate: Date | null): Promise<ShopifyProductNode[]> {
  const queryStr = sinceDate
    ? `updated_at:>=${sinceDate.toISOString().slice(0, 10)}`
    : 'updated_at:>=2023-01-01';
  const all: ShopifyProductNode[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    products: {
      edges: { node: ShopifyProductNode }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(PRODUCTS_DELTA_QUERY, { queryStr, cursor });
    all.push(...data.products.edges.map((e) => e.node));
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

/**
 * Submit a bulk operation to backfill all products + variants since 2023-01-01.
 */
export async function startProductsBulkBackfill(): Promise<{ id: string; status: string }> {
  const bulkBody = `
    {
      products(query: "updated_at:>=2023-01-01") {
        edges {
          node {
            id title vendor productType status tags handle publishedAt totalVariants
            featuredImage { url }
            variants {
              edges {
                node {
                  id sku title price compareAtPrice barcode position
                  inventoryItem {
                    id tracked harmonizedSystemCode countryCodeOfOrigin
                    unitCost { amount }
                    measurement { weight { value unit } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const mutation = `
    mutation {
      bulkOperationRunQuery(query: """${bulkBody}""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `;
  const data = await graphqlRequest<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(mutation);
  const { bulkOperation, userErrors } = data.bulkOperationRunQuery;
  if (userErrors?.length)
    throw new Error(`Shopify bulk op error: ${userErrors.map((e) => e.message).join(', ')}`);
  if (!bulkOperation) throw new Error('Shopify returned null bulkOperation for products');
  return bulkOperation;
}

export interface ShopifyInventoryLevel {
  id: string;
  available: number;
  item: { id: string };
  location: { id: string };
}

const INVENTORY_LEVELS_QUERY = `
  query InvLevels($cursor: String, $locId: ID!) {
    location(id: $locId) {
      id
      inventoryLevels(first: 250, after: $cursor) {
        edges {
          cursor
          node {
            id
            quantities(names: ["available","on_hand","committed"]) { name quantity }
            item { id }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export interface ShopifyInventoryLevelNode {
  id: string;
  source_location_id: string;
  source_inventory_item_id: string;
  available: number;
  on_hand: number | null;
  committed: number | null;
}

/**
 * Fetch inventory levels for ALL locations (snapshot).
 * Caller passes an array of Shopify location GIDs.
 */
export async function fetchInventoryLevels(
  locationGids: string[],
): Promise<ShopifyInventoryLevelNode[]> {
  const all: ShopifyInventoryLevelNode[] = [];
  type LevelEdge = {
    node: {
      id: string;
      quantities: { name: string; quantity: number }[];
      item: { id: string };
    };
  };
  type Resp = {
    location: {
      id: string;
      inventoryLevels: {
        edges: LevelEdge[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } | null;
  };

  for (const locId of locationGids) {
    let cursor: string | null = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const data: Resp = await graphqlRequest<Resp>(INVENTORY_LEVELS_QUERY, { cursor, locId });
      if (!data.location) break;
      for (const edge of data.location.inventoryLevels.edges) {
        const qtyMap = new Map(edge.node.quantities.map((q) => [q.name, q.quantity]));
        all.push({
          id: edge.node.id,
          source_location_id: locId,
          source_inventory_item_id: edge.node.item.id,
          available: qtyMap.get('available') ?? 0,
          on_hand: qtyMap.get('on_hand') ?? null,
          committed: qtyMap.get('committed') ?? null,
        });
      }
      hasNextPage = data.location.inventoryLevels.pageInfo.hasNextPage;
      cursor = data.location.inventoryLevels.pageInfo.endCursor;
      if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
    }
  }
  return all;
}

/* ============================================================================
 * Phase 2 — Marketing & Risk fetch methods
 * ========================================================================= */

export interface ShopifyDiscountNode {
  id: string;
  __typename?: string;
  discount?: {
    title?: string;
    startsAt?: string;
    endsAt?: string | null;
    usageLimit?: number | null;
    customerSelection?: { __typename: string };
    customerGets?: { value: { __typename: string; amount?: { amount: string } | null; percentage?: number } };
    minimumRequirement?: { __typename: string; greaterThanOrEqualToSubtotal?: { amount: string } };
    codes?: { edges: { node: { id: string; code: string; asyncUsageCount: number } }[] };
  };
}

const DISCOUNTS_QUERY = `
  query Discounts($cursor: String) {
    discountNodes(first: 50, after: $cursor) {
      edges {
        cursor
        node {
          id
          discount {
            __typename
            ... on DiscountCodeBasic {
              title startsAt endsAt usageLimit
              customerSelection { __typename }
              customerGets {
                value {
                  __typename
                  ... on DiscountAmount { amount { amount } }
                  ... on DiscountPercentage { percentage }
                }
              }
              minimumRequirement {
                __typename
                ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } }
              }
              codes(first: 10) { edges { node { id code asyncUsageCount } } }
            }
            ... on DiscountAutomaticBasic {
              title startsAt endsAt
              customerGets {
                value {
                  __typename
                  ... on DiscountAmount { amount { amount } }
                  ... on DiscountPercentage { percentage }
                }
              }
              minimumRequirement {
                __typename
                ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function fetchDiscountNodes(): Promise<ShopifyDiscountNode[]> {
  const all: ShopifyDiscountNode[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    discountNodes: {
      edges: { node: ShopifyDiscountNode }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(DISCOUNTS_QUERY, { cursor });
    all.push(...data.discountNodes.edges.map((e) => e.node));
    hasNextPage = data.discountNodes.pageInfo.hasNextPage;
    cursor = data.discountNodes.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export interface ShopifyGiftCard {
  id: string;
  maskedCode: string;
  initialValue: { amount: string; currencyCode: string };
  balance: { amount: string };
  enabled: boolean;
  expiresOn: string | null;
  customer: { id: string } | null;
}

const GIFT_CARDS_QUERY = `
  query GiftCards($cursor: String) {
    giftCards(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id maskedCode enabled expiresOn
          initialValue { amount currencyCode }
          balance { amount }
          customer { id }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function fetchGiftCards(): Promise<ShopifyGiftCard[]> {
  const all: ShopifyGiftCard[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    giftCards: {
      edges: { node: ShopifyGiftCard }[];
      pageInfo: { hasNextPage: boolean; endCursor: string };
    };
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(GIFT_CARDS_QUERY, { cursor });
    all.push(...data.giftCards.edges.map((e) => e.node));
    hasNextPage = data.giftCards.pageInfo.hasNextPage;
    cursor = data.giftCards.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export interface ShopifyDispute {
  id: string;
  status: string;
  reasonDetails: { reason: string; networkReasonCode: string | null } | null;
  amount: { amount: string; currencyCode: string };
  evidenceDueBy: string | null;
  finalizedOn: string | null;
  order: { id: string } | null;
}

const DISPUTES_QUERY = `
  query Disputes($cursor: String) {
    shopifyPaymentsAccount {
      disputes(first: 100, after: $cursor) {
        edges {
          cursor
          node {
            id status evidenceDueBy finalizedOn
            amount { amount currencyCode }
            reasonDetails { reason networkReasonCode }
            order { id }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export async function fetchDisputes(): Promise<ShopifyDispute[]> {
  const all: ShopifyDispute[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    shopifyPaymentsAccount: {
      disputes: {
        edges: { node: ShopifyDispute }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } | null;
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(DISPUTES_QUERY, { cursor });
    if (!data.shopifyPaymentsAccount) break;
    all.push(...data.shopifyPaymentsAccount.disputes.edges.map((e) => e.node));
    hasNextPage = data.shopifyPaymentsAccount.disputes.pageInfo.hasNextPage;
    cursor = data.shopifyPaymentsAccount.disputes.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

/* ============================================================================
 * Shopify Analytics — Sessions via shopifyqlQuery.
 *
 * `shopifyqlQuery` is a Query field (not a Mutation). Response shape on this
 * store's API version (verified 2026-04-29 via probe-shopifyql.ts):
 *
 *   type ShopifyqlQueryResponse {
 *     parseErrors: [String!]
 *     tableData: ShopifyqlTableData
 *   }
 *   type ShopifyqlTableData {
 *     columns: [...]
 *     rows: JSON          # array of objects keyed by column name
 *   }
 *
 * Only the `sessions` dataset (columns: sessions, conversion_rate) is
 * accessible on Shayn's plan tier. Cart-event datasets return
 * "Schema Error: Invalid dataset" — Added-to-cart is not synced.
 * ========================================================================= */

export interface AnalyticsDailyRow {
  /** 'YYYY-MM-DD' in store time zone (Asia/Kolkata). */
  date: string;
  sessions: number;
  /** Orders that had at least one fulfillment on this day (Shopify-bucketed by fulfillment date). */
  orders_fulfilled: number;
}

interface SessionsRow {
  /** ShopifyQL returns DAY_TIMESTAMP as 'YYYY-MM-DD'. */
  day: string;
  /** Numeric ShopifyQL column comes back as string. */
  sessions: string;
}

interface FulfillmentsRow {
  day: string;
  orders_fulfilled: string;
}

interface ShopifyqlResponse<R = Record<string, string>> {
  parseErrors: string[];
  tableData: {
    columns: Array<{ name: string; dataType: string }>;
    rows: R[] | null;
  } | null;
}

const SHOPIFYQL_QUERY = `
  query RunShopifyQL($q: String!) {
    shopifyqlQuery(query: $q) {
      parseErrors
      tableData {
        columns { name dataType }
        rows
      }
    }
  }
`;

export async function runShopifyQLQuery<R = Record<string, string>>(
  query: string,
): Promise<ShopifyqlResponse<R>> {
  type Resp = { shopifyqlQuery: ShopifyqlResponse<R> };
  const data = await graphqlRequest<Resp>(SHOPIFYQL_QUERY, { q: query });
  if (data.shopifyqlQuery.parseErrors?.length) {
    throw new AppError({
      errorType: ERROR_TYPES.INTERNAL_ERROR,
      message: `ShopifyQL parse errors for query "${query}": ${JSON.stringify(data.shopifyqlQuery.parseErrors)}`,
      code: 'SHOPIFYQL_PARSE_ERROR',
    });
  }
  return data.shopifyqlQuery;
}

/**
 * Per-day Sessions and Orders fulfilled for the given window.
 * Two ShopifyQL datasets queried in parallel and merged on `date`:
 *   - `FROM sessions SHOW sessions GROUP BY day`              (storefront sessions)
 *   - `FROM fulfillments SHOW orders_fulfilled GROUP BY day`  (orders fulfilled, by fulfillment date)
 *
 * `untilDate` is exclusive in ShopifyQL's UNTIL semantics, so callers can pass
 * `now()` to get data through the latest available bucket.
 */
export async function fetchAnalyticsDaily(
  sinceDate: Date,
  untilDate: Date,
): Promise<AnalyticsDailyRow[]> {
  const since = sinceDate.toISOString().slice(0, 10);
  const until = untilDate.toISOString().slice(0, 10);

  const [sessionsResp, fulfillmentsResp] = await Promise.all([
    runShopifyQLQuery<SessionsRow>(
      `FROM sessions SHOW sessions SINCE ${since} UNTIL ${until} GROUP BY day`,
    ),
    runShopifyQLQuery<FulfillmentsRow>(
      `FROM fulfillments SHOW orders_fulfilled SINCE ${since} UNTIL ${until} GROUP BY day`,
    ),
  ]);

  const byDate = new Map<string, AnalyticsDailyRow>();
  for (const r of sessionsResp.tableData?.rows ?? []) {
    const date = r.day?.slice(0, 10);
    if (!date) continue;
    const cur = byDate.get(date) ?? { date, sessions: 0, orders_fulfilled: 0 };
    cur.sessions = parseInt(r.sessions ?? '0', 10) || 0;
    byDate.set(date, cur);
  }
  for (const r of fulfillmentsResp.tableData?.rows ?? []) {
    const date = r.day?.slice(0, 10);
    if (!date) continue;
    const cur = byDate.get(date) ?? { date, sessions: 0, orders_fulfilled: 0 };
    cur.orders_fulfilled = parseInt(r.orders_fulfilled ?? '0', 10) || 0;
    byDate.set(date, cur);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
