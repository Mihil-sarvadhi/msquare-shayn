import { getStoreOrderDetails, trackAWBs } from '../modules/ithink/ithink.connector';

async function main(): Promise<void> {
  const gqlOrderId = process.argv[2];
  if (!gqlOrderId) {
    console.error('Usage: npx tsx src/scripts/ithink-test-order.ts <shopify_order_id>');
    console.error(
      'Example: npx tsx src/scripts/ithink-test-order.ts gid://shopify/Order/6515526664471',
    );
    process.exit(1);
  }

  // Extract numeric part from GQL ID
  const numericId = gqlOrderId.includes('/') ? gqlOrderId.split('/').pop()! : gqlOrderId;
  console.error(`\n── Step 1: Store Order Details for order ${numericId} ──`);

  const storeRes = await getStoreOrderDetails([numericId]);
  console.error('Status:', storeRes.status);
  console.error('Data:', JSON.stringify(storeRes.data, null, 2));

  if (storeRes.status !== 'success' || !storeRes.data) {
    console.error('❌ Store order details failed. Stopping.');
    process.exit(1);
  }

  const orderData = storeRes.data[numericId];
  if (!orderData) {
    console.error(`❌ No data returned for order ${numericId}. Order may not exist in iThink.`);
    process.exit(1);
  }

  const awb = orderData.awb_no;
  console.error(`\n── Step 2: Track AWB ${awb} ──`);

  const trackRes = await trackAWBs([awb]);
  console.error('Tracking result:', JSON.stringify(trackRes, null, 2));

  console.error('\n── Merged result ──');
  console.error({
    shopify_order_gql_id: gqlOrderId,
    numeric_order_id: numericId,
    awb,
    logistic: orderData.logistic,
    weight: orderData.weight,
    payment_mode: orderData.payment_mode,
    current_status: trackRes[awb]?.current_status,
    current_status_code: trackRes[awb]?.current_status_code,
    delivered_date: trackRes[awb]?.order_date_time?.delivery_date,
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
