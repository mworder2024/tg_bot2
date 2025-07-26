# Railway Deployment Guide for GameBot

## Prerequisites
- Railway CLI installed: `npm install -g @railway/cli`
- Railway account: https://railway.app
- Git repository initialized

## Step 1: Login to Railway
```bash
railway login
```

## Step 2: Create New Project
```bash
railway new
# Select "Empty Project"
# Enter project name: gamebot-telegram
```

## Step 3: Add PostgreSQL Database
```bash
railway add
# Select "PostgreSQL"
```

## Step 4: Set Environment Variables
```bash
# Set the bot token
railway variables set BOT_TOKEN=8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok

# Set JWT secret
railway variables set JWT_SECRET=$(openssl rand -hex 32)

# Set Node environment
railway variables set NODE_ENV=production

# The DATABASE_URL will be automatically provided by Railway
```

## Step 5: Deploy the Application
```bash
# Link the project
railway link

# Deploy
railway up
```

## Step 6: Run Database Migrations
```bash
# After first deployment, run migrations
railway run npm run migration:run
```

## Step 7: Monitor Deployment
```bash
# Check logs
railway logs

# Open the deployed app
railway open
```

## Environment Variables Checklist
Required variables in Railway dashboard:
- [ ] BOT_TOKEN - Your Telegram bot token
- [ ] JWT_SECRET - Random secure string
- [ ] NODE_ENV - Set to "production"
- [ ] DATABASE_URL - Automatically provided by Railway

## Webhook Configuration (Optional)
If you want to use webhooks instead of polling:
1. Get your Railway app URL: `railway open`
2. Set webhook URL:
```bash
railway variables set BOT_WEBHOOK_URL=https://your-app.railway.app/api/v1/bot/webhook
railway variables set BOT_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

## Troubleshooting

### Bot Not Responding
1. Check logs: `railway logs`
2. Verify BOT_TOKEN is set correctly
3. Ensure the bot module is enabled in app.module.ts

### Database Connection Issues
1. DATABASE_URL is automatically provided by Railway
2. Check if migrations ran successfully
3. Verify PostgreSQL addon is attached

### Health Check Failing
- The app exposes `/api/v1/ping` for health checks
- If failing, check application logs

## Quick Deploy Commands
```bash
# One-liner deploy after setup
git add . && git commit -m "Deploy update" && railway up
```

## Monitoring
- View logs: `railway logs -f`
- Check metrics: `railway open` → Metrics tab
- Database console: `railway connect postgres`

## Important Notes
1. The bot will use **polling mode** by default on Railway
2. No need to worry about Node.js networking issues on Railway
3. Railway provides free tier with 500 hours/month
4. PostgreSQL database is included with automatic backups

## Support
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app