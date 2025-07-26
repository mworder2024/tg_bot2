#!/usr/bin/env python3
import requests
import json

BOT_TOKEN = '8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok'

print("Testing Telegram bot with Python requests...\n")

try:
    # Test getMe
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/getMe'
    print(f"URL: {url}")
    
    response = requests.get(url, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if data['ok']:
            print("\n✅ Bot is valid!")
            print(f"Bot Username: @{data['result']['username']}")
            print(f"Bot Name: {data['result']['first_name']}")
        else:
            print("\n❌ Bot token is invalid!")
            print(f"Error: {data}")
    else:
        print(f"\n❌ HTTP Error: {response.status_code}")
        
except requests.exceptions.Timeout:
    print("\n❌ Request timed out after 30 seconds")
except requests.exceptions.ConnectionError as e:
    print(f"\n❌ Connection error: {e}")
except Exception as e:
    print(f"\n❌ Error: {e}")
    
print("\nIf this works but Node.js doesn't, it might be a Node.js configuration issue.")