# Railway Deployment Checklist

Your project has been successfully pushed to: `git@github.com:mworder2024/tg_bot2.git`

## Next Steps on Railway

### 1. Connect GitHub Repository
1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `mworder2024/tg_bot2` repository
5. Select `main` branch

### 2. Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provide DATABASE_URL

### 3. Configure Environment Variables
In Railway project settings, add these variables:

```bash
BOT_TOKEN=8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok
JWT_SECRET=[generate a secure random string]
NODE_ENV=production
```

Generate JWT_SECRET with:
```bash
openssl rand -hex 32
```

### 4. Deploy
Railway will automatically:
- Detect the NestJS project
- Run `npm ci && npm run build`
- Execute database migrations
- Start with `npm run start:prod`

### 5. Monitor Deployment
- Check build logs in Railway dashboard
- Once deployed, the bot will start polling Telegram
- Health check available at: `https://[your-app].railway.app/api/v1/ping`

## Verification Steps

1. **Check Bot Response**:
   - Open Telegram
   - Search for @MWOR_QuizBot
   - Send `/start` command
   - Bot should respond with welcome message

2. **Check API Health**:
   ```bash
   curl https://[your-app].railway.app/api/v1/ping
   ```

3. **View Logs**:
   - Railway dashboard → Your project → Logs tab
   - Look for "Bot started successfully" message

## Troubleshooting

### If bot doesn't respond:
1. Check Railway logs for errors
2. Verify BOT_TOKEN is set correctly
3. Ensure PostgreSQL is connected (DATABASE_URL exists)

### If build fails:
1. Check build logs for specific errors
2. Verify all dependencies in package.json
3. Ensure TypeScript compiles locally: `npm run build`

## Important Files Created

- `railway.toml` - Railway configuration
- `.env.production` - Production environment template
- `Procfile` - Start command for Railway
- `DEPLOY_TO_RAILWAY.md` - Detailed deployment guide
- Database configuration updated for PostgreSQL support

## Success! 🎉
Your Telegram bot is ready for Railway deployment. The Node.js connection issues will not occur on Railway's infrastructure.