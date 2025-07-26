#!/usr/bin/env node

const https = require('https');

const BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok';

// Test getMe to verify bot is accessible
function testBot() {
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/getMe`,
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const response = JSON.parse(data);
      if (response.ok) {
        console.log('✅ Bot is accessible!');
        console.log('Bot Username: @' + response.result.username);
        console.log('Bot Name: ' + response.result.first_name);
        console.log('Bot ID: ' + response.result.id);
        
        // Get updates to see if bot is receiving messages
        getUpdates();
      } else {
        console.error('❌ Bot error:', response);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error);
  });

  req.end();
}

// Get recent updates
function getUpdates() {
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/getUpdates?limit=5`,
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const response = JSON.parse(data);
      if (response.ok) {
        console.log('\n📨 Recent updates:');
        if (response.result.length === 0) {
          console.log('No recent messages. Send /start to @MWOR_QuizBot to test!');
        } else {
          response.result.forEach(update => {
            if (update.message) {
              console.log(`- From: ${update.message.from.username || update.message.from.first_name}`);
              console.log(`  Text: ${update.message.text}`);
              console.log(`  Date: ${new Date(update.message.date * 1000).toLocaleString()}`);
            }
          });
        }
      }
    });
  });

  req.end();
}

console.log('🤖 Testing Telegram Bot...\n');
testBot();