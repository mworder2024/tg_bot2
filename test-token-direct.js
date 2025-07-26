const https = require('https');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

console.log('Testing bot token directly...\n');

const postData = '';
const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${BOT_TOKEN}/getMe`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nRESPONSE:', data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.ok) {
        console.log('\n✅ Bot token is VALID!');
        console.log('Bot info:', parsed.result);
      } else {
        console.log('\n❌ Bot token is INVALID!');
        console.log('Error:', parsed);
      }
    } catch (e) {
      console.log('Parse error:', e);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Connection error: ${e.message}`);
  console.log('\nPossible issues:');
  console.log('1. Check your internet connection');
  console.log('2. Try using a different network');
  console.log('3. Check if Telegram is accessible in your region');
  console.log('4. Try using a VPN');
});

req.write(postData);
req.end();