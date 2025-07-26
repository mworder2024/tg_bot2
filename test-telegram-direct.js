const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

function makeRequest(useProxy = false) {
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/getMe`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
    },
  };

  // Check for proxy environment variables
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  if (httpProxy || httpsProxy) {
    console.log('🔧 Proxy detected:', httpProxy || httpsProxy);
  }

  // If proxy is set and we want to use it
  if (useProxy && (httpProxy || httpsProxy)) {
    const proxyUrl = httpsProxy || httpProxy;
    options.agent = new HttpsProxyAgent(proxyUrl);
  }

  console.log(`🧪 Testing Telegram API ${useProxy ? 'with' : 'without'} proxy...`);
  console.log(`URL: https://${options.hostname}${options.path}`);

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.ok) {
          console.log('✅ Bot is accessible!');
          console.log('Response:', JSON.stringify(response, null, 2));
        } else {
          console.error('❌ Bot error:', response);
        }
      } catch (e) {
        console.error('❌ Parse error:', e);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
  });

  req.setTimeout(10000, () => {
    console.error('❌ Request timeout after 10 seconds');
    req.destroy();
  });

  req.end();
}

// Test without proxy first
makeRequest(false);

// If that fails, we could try with proxy
// setTimeout(() => makeRequest(true), 5000);