/* eslint-disable */
const path = require('path');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const CREDENTIALS_PATH = path.resolve(__dirname, '../../ga4-credentials.json');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`Status: FAILED - credentials file not found at ${CREDENTIALS_PATH}`);
    process.exit(1);
  }

  const auth = new GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: [SCOPE],
  });

  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const expiry = client.credentials.expiry_date
    ? new Date(client.credentials.expiry_date).toISOString()
    : 'unknown';

  console.log(`Token: ${token}`);
  console.log(`Expires: ${expiry}`);
  console.log('Status: SUCCESS - Token generated successfully');
}

main().catch((err) => {
  console.error(`Status: FAILED - ${err.message}`);
  process.exit(1);
});
