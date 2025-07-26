const { Bot } = require('grammy');
const dns = require('dns');
const https = require('https');

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

async function testWithIPv4Only() {
  console.log('Testing Grammy with IPv4 only...\n');
  
  try {
    // Create custom agent that forces IPv4
    const agent = new https.Agent({
      family: 4, // Force IPv4
      rejectUnauthorized: true,
      keepAlive: false,
      timeout: 60000
    });

    const bot = new Bot(BOT_TOKEN, {
      client: {
        timeoutSeconds: 60,
        baseFetchConfig: {
          agent: agent,
          signal: AbortSignal.timeout(60000),
        }
      }
    });

    console.log('Attempting getMe...');
    const me = await bot.api.getMe();
    console.log('✅ Success with IPv4!');
    console.log('Bot info:', me);
    
    // Try to start polling
    bot.command('start', ctx => ctx.reply('Hello!'));
    
    await bot.start({
      drop_pending_updates: true,
      onStart: () => console.log('✅ Bot started successfully!')
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Stack:', error.stack);
  }
}

// Also test with direct HTTPS request
async function testDirectHttps() {
  console.log('\nTesting direct HTTPS with IPv4...\n');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/getMe`,
      method: 'GET',
      family: 4, // Force IPv4
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response:', data);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('Direct HTTPS error:', err.message);
      resolve();
    });

    req.on('timeout', () => {
      console.error('Request timeout!');
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function main() {
  await testDirectHttps();
  await testWithIPv4Only();
}

main();