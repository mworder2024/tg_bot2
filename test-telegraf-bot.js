const { Telegraf } = require('telegraf');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

async function testTelegraf() {
  console.log('Testing with Telegraf...\n');
  
  try {
    const bot = new Telegraf(BOT_TOKEN);
    
    // Test connection
    const me = await bot.telegram.getMe();
    console.log('✅ Telegraf connected successfully!');
    console.log('Bot info:', me);
    
    // Set up basic command
    bot.command('start', (ctx) => ctx.reply('Hello from Telegraf!'));
    
    // Start polling
    bot.launch({
      dropPendingUpdates: true
    });
    
    console.log('✅ Bot is running with Telegraf!');
    console.log('Try sending /start to the bot');
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Telegraf error:', error.message);
  }
}

testTelegraf();