const { Bot } = require('grammy');

// Test with minimal bot setup
async function testBot() {
  const token = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';
  
  console.log('Testing minimal Grammy bot...');
  console.log('Token:', token.substring(0, 10) + '...');
  
  try {
    const bot = new Bot(token);
    
    // Try to get bot info
    console.log('\nAttempting to connect...');
    const me = await bot.api.getMe();
    console.log('✅ SUCCESS! Bot connected!');
    console.log('Bot username:', me.username);
    console.log('Bot name:', me.first_name);
    
    // Set up simple command
    bot.command('start', (ctx) => ctx.reply('Bot is working!'));
    bot.command('test', (ctx) => ctx.reply('Test successful!'));
    
    // Start the bot
    console.log('\nStarting bot polling...');
    bot.start();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.error_code === 401) {
      console.log('\n⚠️  Bot token is INVALID or REVOKED!');
      console.log('Please check:');
      console.log('1. The bot token is correct');
      console.log('2. The bot hasn\'t been deleted');
      console.log('3. Get a new token from @BotFather on Telegram');
    } else if (error.error_code === 404) {
      console.log('\n⚠️  Bot not found!');
      console.log('The bot may have been deleted.');
    } else {
      console.log('\nError details:', error);
    }
  }
}

testBot();