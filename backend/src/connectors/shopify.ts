import axios from 'axios';

const SHOPIFY_ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;

const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN as string,
};

const ORDERS_QUERY = `
  query GetOrders($query: String, $cursor: String) {
    orders(first: 250, query: $query, after: $cursor, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          paymentGatewayNames
          totalPriceSet { shopMoney { amount currencyCode } }
          discountCodes { code }
          customer { id email defaultAddress { city province } }
          lineItems(first: 20) {
            edges {
              node {
                sku
                title
                quantity
                variant { id title }
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
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
  discountCodes: Array<{ code: string }>;
  customer?: {
    id: string;
    email: string;
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

export async function graphqlRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await axios.post(SHOPIFY_ENDPOINT, { query, variables }, { headers });
  if (response.data.errors) throw new Error(JSON.stringify(response.data.errors));
  return response.data.data as T;
}

export async function fetchRecentOrders(updatedAtMin?: string): Promise<ShopifyOrder[]> {
  const queryStr = updatedAtMin
    ? `updated_at:>='${updatedAtMin}'`
    : 'created_at:>=2025-04-01';
  let allOrders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  type OrdersResponse = { orders: { edges: Array<{ node: ShopifyOrder }>; pageInfo: { hasNextPage: boolean; endCursor: string } } };
  while (hasNextPage) {
    const data: OrdersResponse = await graphqlRequest<OrdersResponse>(
      ORDERS_QUERY,
      { query: queryStr, cursor }
    );
    const { edges, pageInfo } = data.orders;
    allOrders = allOrders.concat(edges.map((e) => e.node));
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
    if (hasNextPage) await new Promise((r) => setTimeout(r, 500));
  }
  return allOrders;
}

const BULK_ORDERS_QUERY = `
  mutation {
    bulkOperationRunQuery(
      query: """
      {
        orders(query: "created_at:>=2025-04-01") {
          edges { node {
            id name createdAt
            displayFinancialStatus displayFulfillmentStatus
            paymentGatewayNames
            totalPriceSet { shopMoney { amount } }
            discountCodes
            customer { id email defaultAddress { city province } }
            lineItems {
              edges { node {
                sku title quantity
                originalUnitPriceSet { shopMoney { amount } }
              }}
            }
          }}
        }
      }
      """
    ) {
      bulkOperation { id status }
      userErrors { field message }
    }
  }
`;

export async function startBulkBackfill(): Promise<{ id: string; status: string }> {
  const data = await graphqlRequest<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ field: string; message: string }>;
    };
  }>(BULK_ORDERS_QUERY);

  const { bulkOperation, userErrors } = data.bulkOperationRunQuery;

  if (userErrors?.length) {
    throw new Error(`Shopify bulk operation error: ${userErrors.map((e) => e.message).join(', ')}`);
  }
  if (!bulkOperation) {
    throw new Error('Shopify returned null bulkOperation — another operation may already be running. Check your Shopify admin.');
  }

  return bulkOperation;
}

export async function checkBulkStatus(operationId: string): Promise<{ id: string; status: string; url?: string; errorCode?: string }> {
  const query = `
    query { bulkOperation(id: "${operationId}") { id status url errorCode } }
  `;
  const data = await graphqlRequest<{ bulkOperation: { id: string; status: string; url?: string; errorCode?: string } }>(query);
  return data.bulkOperation;
}

export interface AbandonedCheckout {
  id: string;
  createdAt: string;
  abandonedCheckoutUrl: string;
  totalPriceV2: { amount: string };
  email: string;
  lineItems: { edges: Array<{ node: { title: string; quantity: number } }> };
}

export async function fetchAbandonedCheckouts(): Promise<AbandonedCheckout[]> {
  const query = `
    query {
      abandonedCheckouts(first: 250) {
        edges { node {
          id createdAt abandonedCheckoutUrl
          totalPriceV2 { amount }
          email
          lineItems(first: 5) {
            edges { node { title quantity } }
          }
        }}
      }
    }
  `;
  const data = await graphqlRequest<{ abandonedCheckouts: { edges: Array<{ node: AbandonedCheckout }> } }>(query);
  return data.abandonedCheckouts.edges.map((e) => e.node);
}
