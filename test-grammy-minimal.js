const { Bot } = require('grammy');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

async function testBot() {
  console.log('Creating bot instance...');
  
  const bot = new Bot(BOT_TOKEN, {
    client: {
      // Increase timeout to handle slow connections
      timeoutSeconds: 90,
      // Add retry configuration
      retryLimit: 3,
      // Configure base fetch options
      baseFetchConfig: {
        compress: true,
        agent: undefined, // Let it use default agent
      },
    },
  });

  console.log('Testing bot.api.getMe()...');
  try {
    const me = await bot.api.getMe();
    console.log('✅ Bot connected successfully!');
    console.log('Bot info:', me);
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    console.error('Error details:', error);
  }

  console.log('\nTrying to start polling...');
  bot.command('start', (ctx) => ctx.reply('Hello!'));
  
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  try {
    await bot.start({
      drop_pending_updates: true,
      onStart: (botInfo) => {
        console.log('✅ Bot started polling successfully!');
        console.log('Bot username:', botInfo.username);
      },
    });
  } catch (error) {
    console.error('❌ Failed to start polling:', error.message);
    console.error('Error type:', error.constructor.name);
    if (error.message.includes('ETIMEDOUT')) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. You may need to use a proxy');
      console.log('2. Your ISP might be blocking Telegram');
      console.log('3. Try using a VPN');
    }
  }
}

testBot();