const { Bot } = require('grammy');
const https = require('https');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

// Test basic HTTPS connection first
function testHttps() {
  return new Promise((resolve, reject) => {
    console.log('Testing basic HTTPS connection to Telegram...');
    
    https.get('https://api.telegram.org', (res) => {
      console.log('✅ HTTPS connection successful!');
      console.log('Status code:', res.statusCode);
      resolve();
    }).on('error', (err) => {
      console.error('❌ HTTPS error:', err.message);
      reject(err);
    });
  });
}

async function testGrammyWithDebug() {
  console.log('\nTesting Grammy with debug options...\n');
  
  // Try with different fetch configurations
  const configs = [
    {
      name: 'Default config',
      config: {}
    },
    {
      name: 'With custom agent',
      config: {
        client: {
          baseFetchConfig: {
            agent: new https.Agent({
              rejectUnauthorized: false,
              keepAlive: true
            })
          }
        }
      }
    },
    {
      name: 'With different timeout',
      config: {
        client: {
          timeoutSeconds: 30,
          baseFetchConfig: {
            compress: false
          }
        }
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\nTrying: ${name}`);
    try {
      const bot = new Bot(BOT_TOKEN, config);
      const me = await bot.api.getMe();
      console.log('✅ Success!', me);
      return;
    } catch (error) {
      console.error('❌ Failed:', error.message);
    }
  }
}

async function main() {
  try {
    await testHttps();
    await testGrammyWithDebug();
  } catch (error) {
    console.error('Final error:', error);
  }
}

main();