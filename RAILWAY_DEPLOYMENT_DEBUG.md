# Railway Deployment Debugging Guide

## Common Railway Deployment Issues & Solutions

### 1. Build Succeeds but Deploy Fails
This usually indicates a runtime issue. Check:

1. **Environment Variables**
   - Ensure `BOT_TOKEN` is set in Railway dashboard
   - Add `JWT_SECRET` (generate with `openssl rand -hex 32`)
   - Verify `DATABASE_URL` is automatically provided by PostgreSQL

2. **Database Connection**
   - Railway PostgreSQL addon must be attached
   - Check Railway logs for database connection errors
   - The app will fail if it can't connect to the database

3. **Port Binding**
   - Railway provides `PORT` environment variable
   - We've updated the app to bind to `0.0.0.0` for Railway

### 2. Health Check Failing
- Health check endpoint: `/api/v1/ping`
- Timeout increased to 300 seconds
- If still failing, check Railway logs for startup errors

### 3. Missing Dependencies
Railway uses production dependencies only. Ensure all required packages are in `dependencies` not `devDependencies`.

### 4. TypeORM Issues
Common TypeORM errors on Railway:
- "No repository for entity" - Entities not loaded correctly
- "Cannot read property 'type' of undefined" - Database connection not established

### 5. Quick Fixes Applied
1. ✅ Updated `main.ts` to bind to `0.0.0.0`
2. ✅ Fixed health check endpoint path
3. ✅ Increased health check timeout
4. ✅ Simplified start command
5. ✅ Added nixpacks.toml for build control
6. ✅ Removed unnecessary service configuration

## Railway CLI Commands

```bash
# View deployment logs
railway logs

# Run command in Railway environment
railway run node --version

# Check environment variables
railway variables

# Redeploy
railway up

# Connect to database
railway connect postgres
```

## Manual Deployment Steps

If automatic deployment fails:

1. **In Railway Dashboard:**
   - Delete the failed deployment
   - Go to Settings → General
   - Click "Redeploy" 

2. **Check Build Logs:**
   - Look for TypeScript compilation errors
   - Check for missing dependencies

3. **Check Deploy Logs:**
   - Look for "Application is running on port"
   - Check for database connection errors
   - Look for "Bot started successfully"

## Environment Variables Checklist

Required in Railway:
```
BOT_TOKEN=8121322920:AAFQ5jSf_aaVj9e6e_joWAkQ1ptI1srICok
JWT_SECRET=[generate with: openssl rand -hex 32]
NODE_ENV=production
```

Automatically provided by Railway:
```
PORT
DATABASE_URL
```

## If Still Failing

1. Try a manual build locally:
   ```bash
   npm ci
   npm run build
   NODE_ENV=production node dist/main.js
   ```

2. Check for TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

3. Verify all entities are exported:
   - Check `src/entities/` directory
   - Ensure all entities are imported in `database.module.ts`

4. Test with minimal configuration:
   - Temporarily disable the bot module
   - Deploy just the HTTP API
   - Then re-enable the bot module

## Success Indicators

When deployment succeeds, you'll see:
1. "Build successful" in Railway logs
2. "Deploy successful" status
3. Health check passing (green status)
4. In deploy logs: "Application is running on port 3000"
5. Bot responding to commands in Telegram