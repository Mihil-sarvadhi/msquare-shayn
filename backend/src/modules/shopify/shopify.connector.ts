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
