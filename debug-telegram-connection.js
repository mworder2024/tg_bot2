const https = require('https');
const dns = require('dns').promises;
const { Bot } = require('grammy');

async function debugConnection() {
  console.log('🔍 Debugging Telegram Connection Issues\n');
  
  const token = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';
  
  // 1. Check DNS
  console.log('1. Checking DNS resolution...');
  try {
    const addresses = await dns.resolve4('api.telegram.org');
    console.log('✅ DNS resolved to:', addresses);
  } catch (err) {
    console.log('❌ DNS resolution failed:', err.message);
  }
  
  // 2. Test raw HTTPS connection
  console.log('\n2. Testing raw HTTPS connection...');
  await new Promise((resolve) => {
    const req = https.get('https://api.telegram.org', (res) => {
      console.log('✅ HTTPS connection established');
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      res.destroy();
      resolve();
    });
    
    req.on('error', (err) => {
      console.log('❌ HTTPS connection failed:', err.message);
      resolve();
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Connection timeout after 10 seconds');
      req.destroy();
      resolve();
    });
  });
  
  // 3. Test with different Node.js options
  console.log('\n3. Testing with NODE_TLS_REJECT_UNAUTHORIZED=0...');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    const bot = new Bot(token);
    const me = await bot.api.getMe();
    console.log('✅ Bot connected with TLS bypass!');
    console.log('Bot:', me);
  } catch (err) {
    console.log('❌ Still failed:', err.message);
  }
  
  // 4. Test with custom agent
  console.log('\n4. Testing with custom HTTPS agent...');
  const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 1,
    timeout: 30000,
    rejectUnauthorized: false
  });
  
  try {
    const bot = new Bot(token, {
      client: {
        baseFetchConfig: {
          agent: agent
        }
      }
    });
    const me = await bot.api.getMe();
    console.log('✅ Bot connected with custom agent!');
    console.log('Bot:', me);
  } catch (err) {
    console.log('❌ Custom agent failed:', err.message);
  }
  
  // 5. Check system proxy settings
  console.log('\n5. System proxy settings:');
  console.log('HTTP_PROXY:', process.env.HTTP_PROXY || 'not set');
  console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY || 'not set');
  console.log('NO_PROXY:', process.env.NO_PROXY || 'not set');
  
  console.log('\n💡 Recommendations:');
  console.log('1. Try: export NODE_TLS_REJECT_UNAUTHORIZED=0');
  console.log('2. Try using a VPN or proxy');
  console.log('3. Check firewall/antivirus settings');
  console.log('4. Try a different network (mobile hotspot, etc)');
}

debugConnection();