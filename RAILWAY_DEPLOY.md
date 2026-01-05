# Railway Deployment Guide - Quick Start

## Why Railway?
- ✅ **No timeout limits** - Your 20-second research will complete
- ✅ **Free tier** - $5 credit per month (enough for assessment)
- ✅ **Persistent server** - Background processes work perfectly
- ✅ **Simple setup** - 5 minutes to deploy

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

## Step 2: Login

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Initialize Project

In your project directory:

```bash
railway init
```

Choose:
- Create new project: "research-assistant"
- Environment: "production"

## Step 4: Link Project

```bash
railway link
```

## Step 5: Add Environment Variables

**Option A: Via CLI (one by one)**

```bash
railway variables set OPENAI_API_KEY="sk-proj-..."
railway variables set GEMINI_API_KEY="AIza..."
railway variables set SENDGRID_API_KEY="SG..."
railway variables set SENDGRID_FROM_EMAIL="your@email.com"
railway variables set SENDGRID_FROM_NAME="Research Assistant"

# Firebase Client
railway variables set NEXT_PUBLIC_FIREBASE_API_KEY="..."
railway variables set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
railway variables set NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
railway variables set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
railway variables set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
railway variables set NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin
railway variables set FIREBASE_ADMIN_PROJECT_ID="..."
railway variables set FIREBASE_ADMIN_CLIENT_EMAIL="..."
railway variables set FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Option B: Via Dashboard (easier for Firebase key)**

```bash
railway open
```

Go to: Variables tab → Add all variables from your `.env.local`

## Step 6: Deploy

```bash
railway up
```

This will:
1. Upload your code
2. Install dependencies
3. Build Next.js app
4. Start the server

## Step 7: Get Your URL

```bash
railway domain
```

Or go to dashboard → Settings → Generate Domain

## Step 8: Add Production URL

After getting your Railway URL:

```bash
railway variables set NEXT_PUBLIC_APP_URL="https://research-assistant-production.up.railway.app"
```

Then redeploy:

```bash
railway up
```

## Step 9: Monitor Logs

```bash
railway logs
```

Look for:
```
[RESEARCH] Starting research for session: xxx
[OPENAI] Request successful
[GEMINI] Request successful
[EMAIL] Email sent successfully
[RESEARCH] Research completed successfully ✅
```

## Troubleshooting

### Build fails
```bash
railway logs --build
```

### Runtime errors
```bash
railway logs
```

### Check environment variables
```bash
railway variables
```

### Redeploy
```bash
railway up --detach
```

## Cost

- **Free tier**: $5 credit/month
- **Typical usage**: ~$0.50/day if running 24/7
- **For assessment**: Free tier is plenty (1-2 weeks)

## Alternative: Railway Dashboard Deploy

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your `research-assistant` repo
5. Add environment variables
6. Click "Deploy"

## Success!

Once deployed, your research will complete in ~20 seconds with no timeout issues!

Test the full flow:
1. Sign in with Google
2. Submit research
3. Answer refinement questions
4. Wait ~20 seconds
5. Check email for PDF ✅

Your live URL: `https://your-app.railway.app`
