const { Bot } = require('grammy');
const { HttpsProxyAgent } = require('https-proxy-agent');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

// Common free proxy servers (you may need to find working ones)
const PROXY_OPTIONS = [
  'http://proxy.server:port', // Replace with actual proxy
  'socks5://127.0.0.1:9050',  // Tor proxy if installed
];

async function testBotWithProxy() {
  console.log('Testing connection with proxy...\n');

  // Option 1: Using HTTPS proxy
  try {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
      console.log(`Using proxy from environment: ${proxyUrl}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      
      const bot = new Bot(BOT_TOKEN, {
        client: {
          baseFetchConfig: {
            agent,
            compress: true,
          },
          timeoutSeconds: 90,
        },
      });

      const me = await bot.api.getMe();
      console.log('✅ Connected via proxy!');
      console.log('Bot info:', me);
      return bot;
    }
  } catch (error) {
    console.error('Proxy connection failed:', error.message);
  }

  // Option 2: Direct connection with different settings
  console.log('\nTrying direct connection with custom settings...');
  const bot = new Bot(BOT_TOKEN, {
    client: {
      // Try webhook mode instead of polling
      apiRoot: 'https://api.telegram.org',
      webhookReplyEnvelope: false,
      // Increase all timeouts
      timeoutSeconds: 120,
      retryLimit: 5,
      baseFetchConfig: {
        compress: true,
        // Custom headers
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GrammyBot/1.0)',
        },
      },
    },
  });

  try {
    const me = await bot.api.getMe();
    console.log('✅ Direct connection successful!');
    console.log('Bot info:', me);
    return bot;
  } catch (error) {
    console.error('❌ Direct connection failed:', error.message);
    
    console.log('\n🔧 Solutions to try:');
    console.log('1. Set up a proxy:');
    console.log('   export HTTPS_PROXY=http://your-proxy:port');
    console.log('   node test-grammy-proxy.js');
    console.log('\n2. Use a VPN service');
    console.log('\n3. Try webhook mode instead of polling');
    console.log('\n4. Deploy to a cloud service (Railway, Heroku, etc.)');
    console.log('\n5. Use ngrok for local development:');
    console.log('   npx ngrok http 3000');
    throw error;
  }
}

// Alternative: Test using node-fetch directly
async function testDirectFetch() {
  console.log('\nTesting direct fetch to Telegram API...');
  const fetch = require('node-fetch');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    const data = await response.json();
    console.log('Direct fetch result:', data);
  } catch (error) {
    console.error('Direct fetch failed:', error.message);
  }
}

async function main() {
  try {
    await testDirectFetch();
    await testBotWithProxy();
  } catch (error) {
    console.error('\nFinal error:', error.message);
  }
}

main();