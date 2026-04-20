import { checkPincode } from '../modules/ithink/ithink.connector';

async function main(): Promise<void> {
  console.log('Checking iThink credentials via pincode endpoint...');
  try {
    const res = await checkPincode('380001');
    if (res.status === 'success' || res.data) {
      console.log('✅ iThink credentials valid. Response:', JSON.stringify(res, null, 2));
    } else {
      console.error('❌ iThink responded but credentials may be invalid:', res);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ iThink unreachable or credentials rejected:', (err as Error).message);
    process.exit(1);
  }
}

main();
