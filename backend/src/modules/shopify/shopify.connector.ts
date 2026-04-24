import axios from 'axios';
import { environment } from '@config/config';

const SHOPIFY_ENDPOINT = `https://${environment.shopify.storeDomain}/admin/api/${environment.shopify.apiVersion}/graphql.json`;

const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': environment.shopify.accessToken,
};

const ORDERS_QUERY = `
  query GetOrders($query: String, $cursor: String) {
    orders(first: 250, query: $query, after: $cursor, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id name createdAt displayFinancialStatus displayFulfillmentStatus
          paymentGatewayNames
          totalPriceSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalRefundedSet { shopMoney { amount } }
          discountCodes
          customer { id email firstName lastName defaultAddress { city province } }
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

export interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  paymentGatewayNames: string[];
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalDiscountsSet?: { shopMoney: { amount: string } };
  totalShippingPriceSet?: { shopMoney: { amount: string } };
  totalTaxSet?: { shopMoney: { amount: string } };
  totalRefundedSet?: { shopMoney: { amount: string } };
  discountCodes: string[];
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
  const queryStr = updatedAtMin
    ? `updated_at:>='${updatedAtMin}'`
    : `created_at:>=${environment.shopify.syncStartDate}`;
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
    customers: { edges: Array<CustomersEdge>; pageInfo: { hasNextPage: boolean; endCursor: string } };
  };

  while (hasNextPage) {
    const data: CustomersResponse = await graphqlRequest<CustomersResponse>(CUSTOMERS_QUERY, { cursor });
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
      id name createdAt displayFinancialStatus displayFulfillmentStatus paymentGatewayNames
      totalPriceSet { shopMoney { amount } }
      totalDiscountsSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      totalTaxSet { shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      discountCodes
      customer { id email defaultAddress { city province } }
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
