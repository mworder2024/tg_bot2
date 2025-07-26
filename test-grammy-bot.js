const { Bot } = require('grammy');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

async function testBot() {
  console.log('🧪 Testing Grammy bot connection...\n');
  
  try {
    const bot = new Bot(BOT_TOKEN);
    
    // Get bot info
    const botInfo = await bot.api.getMe();
    console.log('✅ Bot connected successfully!');
    console.log('Bot Username: @' + botInfo.username);
    console.log('Bot Name: ' + botInfo.first_name);
    console.log('Bot ID: ' + botInfo.id);
    
    // Set up a simple command handler
    bot.command('test', (ctx) => ctx.reply('Bot is working!'));
    
    // Try to get updates manually
    console.log('\n📨 Checking for messages...');
    const updates = await bot.api.getUpdates({ limit: 5 });
    
    if (updates.length === 0) {
      console.log('No recent messages.');
    } else {
      console.log(`Found ${updates.length} recent updates:`);
      updates.forEach(update => {
        if (update.message) {
          console.log(`- From: ${update.message.from.username || update.message.from.first_name}`);
          console.log(`  Text: ${update.message.text}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Bot error:', error.message);
    if (error.description) {
      console.error('Description:', error.description);
    }
  }
}

testBot();