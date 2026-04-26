import axios from 'axios';
import { environment } from '@config/config';

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
      lineItems { edges { node { sku title quantity originalUnitPriceSet { shopMoney { amount } } }}}
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
  const query = `query { abandonedCheckouts(first: 250) { edges { node {
    id createdAt abandonedCheckoutUrl totalPriceSet { shopMoney { amount } }
    customer { email }
    lineItems(first: 5) { edges { node { title quantity } }}
  }}}}`;
  const data = await graphqlRequest<{
    abandonedCheckouts: { edges: Array<{ node: AbandonedCheckout }> };
  }>(query);
  return data.abandonedCheckouts.edges.map((e) => e.node);
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

export interface ShopifyPayout {
  id: string;
  issuedAt: string;
  status: string;
  net: { amount: string; currencyCode: string };
  summary: {
    chargesGross: { amount: string };
    refundsGross: { amount: string };
    adjustmentsGross: { amount: string };
    chargesFee: { amount: string };
    refundsFee: { amount: string };
    adjustmentsFee: { amount: string };
  };
  bankAccount: {
    accountNumberLastDigits: string | null;
    bankName: string | null;
    routingNumber: string | null;
  } | null;
}

const PAYOUTS_QUERY = `
  query Payouts($cursor: String) {
    shopifyPaymentsAccount {
      payouts(first: 50, after: $cursor) {
        edges {
          cursor
          node {
            id issuedAt status
            net { amount currencyCode }
            summary {
              chargesGross { amount }
              refundsGross { amount }
              adjustmentsGross { amount }
              chargesFee { amount }
              refundsFee { amount }
              adjustmentsFee { amount }
            }
            bankAccount { accountNumberLastDigits bankName routingNumber }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export async function fetchPayouts(sinceDate: Date | null): Promise<ShopifyPayout[]> {
  const all: ShopifyPayout[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    shopifyPaymentsAccount: {
      payouts: {
        edges: { node: ShopifyPayout }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } | null;
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(PAYOUTS_QUERY, { cursor });
    if (!data.shopifyPaymentsAccount) break;
    const nodes = data.shopifyPaymentsAccount.payouts.edges.map((e) => e.node);
    if (sinceDate) {
      const filtered = nodes.filter((p) => new Date(p.issuedAt) >= sinceDate);
      all.push(...filtered);
      if (filtered.length < nodes.length) break;
    } else {
      all.push(...nodes);
    }
    hasNextPage = data.shopifyPaymentsAccount.payouts.pageInfo.hasNextPage;
    cursor = data.shopifyPaymentsAccount.payouts.pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

export interface ShopifyBalanceTransaction {
  id: string;
  type: string;
  test: boolean;
  transactionDate: string;
  amount: { amount: string };
  fee: { amount: string };
  net: { amount: string };
  associatedPayout: { id: string } | null;
  associatedOrder: { id: string } | null;
  sourceId: string | null;
  sourceType: string | null;
  sourceOrderTransactionId: string | null;
}

const BALANCE_TX_QUERY = `
  query BalanceTransactions($cursor: String) {
    shopifyPaymentsAccount {
      balanceTransactions(first: 100, after: $cursor) {
        edges {
          cursor
          node {
            id type test transactionDate
            amount { amount }
            fee { amount }
            net { amount }
            associatedPayout { id }
            associatedOrder { id }
            sourceId sourceType sourceOrderTransactionId
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export async function fetchBalanceTransactions(
  sinceDate: Date | null,
): Promise<ShopifyBalanceTransaction[]> {
  const all: ShopifyBalanceTransaction[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  type Resp = {
    shopifyPaymentsAccount: {
      balanceTransactions: {
        edges: { node: ShopifyBalanceTransaction }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    } | null;
  };
  while (hasNextPage) {
    const data: Resp = await graphqlRequest<Resp>(BALANCE_TX_QUERY, { cursor });
    if (!data.shopifyPaymentsAccount) break;
    const nodes = data.shopifyPaymentsAccount.balanceTransactions.edges.map((e) => e.node);
    if (sinceDate) {
      const filtered = nodes.filter((t) => new Date(t.transactionDate) >= sinceDate);
      all.push(...filtered);
      if (filtered.length < nodes.length) break;
    } else {
      all.push(...nodes);
    }
    hasNextPage = data.shopifyPaymentsAccount.balanceTransactions.pageInfo.hasNextPage;
    cursor = data.shopifyPaymentsAccount.balanceTransactions.pageInfo.endCursor;
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
          transactions {
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
            transactions {
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
