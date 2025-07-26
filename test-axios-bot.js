const axios = require('axios');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

async function testWithAxios() {
  console.log('Testing Telegram API with axios...\n');
  
  try {
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    console.log('✅ SUCCESS!');
    console.log('Bot info:', response.data.result);
    
    // Now try with Grammy but using axios
    console.log('\nTrying Grammy with custom client...');
    const { Bot } = require('grammy');
    
    // Create custom adapter
    const customAdapter = {
      fetch: async (url, options) => {
        try {
          const response = await axios({
            method: options.method || 'GET',
            url: url,
            data: options.body,
            headers: options.headers,
            timeout: 30000
          });
          
          return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            json: async () => response.data,
            text: async () => JSON.stringify(response.data)
          };
        } catch (error) {
          throw error;
        }
      }
    };
    
    const bot = new Bot(BOT_TOKEN);
    
    // Setup simple command
    bot.command('start', (ctx) => ctx.reply('Bot is working!'));
    
    console.log('Starting bot with axios adapter...');
    bot.start();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// First check if axios is installed
try {
  require.resolve('axios');
  testWithAxios();
} catch(e) {
  console.log('Installing axios...');
  const { execSync } = require('child_process');
  execSync('npm install axios', { stdio: 'inherit' });
  testWithAxios();
}