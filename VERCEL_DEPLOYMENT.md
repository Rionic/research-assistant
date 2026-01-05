# Vercel Deployment Guide

## The Problem

Your research assistant works perfectly locally but shows an endless spinner on Vercel. This is due to **serverless function timeout limits**.

## Why It Happens

1. Research takes 30-90 seconds (OpenAI + Gemini + PDF + Email)
2. Vercel serverless functions have strict timeout limits:
   - **Hobby**: 10 seconds ❌
   - **Pro**: 60 seconds ⚠️ (may timeout for complex queries)
   - **Enterprise**: 900 seconds ✅

3. When `performResearch()` is called without `await`, Vercel terminates the function after the response is sent, **killing the background process**.

## The Fix (Already Implemented)

I've implemented a dual-strategy approach:

### Strategy 1: Vercel `waitUntil()` API
- Uses Vercel's Edge Runtime `waitUntil()` to keep functions alive
- Automatically detected and used when available
- **Requires Vercel Pro plan or Edge Runtime**

### Strategy 2: Webhook Fallback
- Falls back to webhook pattern when `waitUntil()` is unavailable
- Calls `/api/process-research` endpoint in a new request
- Separate request lifecycle with extended timeout

## Deployment Options

### Option 1: Vercel Pro Plan ✅ Recommended

**Cost:** $20/month per member

**Setup:**
1. Upgrade to Vercel Pro
2. In project settings → Functions:
   - Set **Max Duration: 300 seconds**
3. Deploy as normal
4. Set environment variable:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

**Pros:**
- Fast global CDN
- Easy deployment
- Good for production

**Cons:**
- Requires paid plan
- 300s max (may timeout for very complex research)

### Option 2: Railway ✅ Best for Assessment

**Cost:** Free tier available, $5/month for Pro

**Setup:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set GEMINI_API_KEY=AIza...
# ... (all other env vars)
```

**Pros:**
- **Unlimited execution time** ✅
- Free tier available
- Simple deployment
- No timeout issues

**Cons:**
- Slower than Vercel CDN
- Less scalable than serverless

### Option 3: Render ✅ Also Good

**Cost:** Free tier available

**Setup:**
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repo
4. Configure:
   - Build: `npm install && npm run build`
   - Start: `npm start`
5. Add all environment variables
6. Deploy

**Pros:**
- Unlimited execution time
- Free tier
- Easy setup

**Cons:**
- Free tier sleeps after inactivity (15 min startup delay)

### Option 4: Vercel Hobby + External Processing

If you want to stay on Vercel Hobby, you can:
1. Deploy frontend to Vercel
2. Deploy backend to Railway/Render
3. Point API calls to external backend

**Not recommended for this assessment** - adds complexity.

## Recommended for Take-Home Assessment

**Use Railway or Render:**
- No timeout issues
- Free tier works
- Simple deployment
- Meets all assessment requirements

## Testing the Fix

After deployment, monitor logs:

```bash
# Vercel
vercel logs --follow

# Railway
railway logs --follow

# Render
# View logs in dashboard
```

Look for:
```
[RESEARCH] Starting research for session: xxx
[OPENAI] Request successful
[GEMINI] Request successful
[RESEARCH] Email sent successfully
[RESEARCH] Research completed successfully
```

If you see the full flow complete, the fix is working! ✅

## Current Implementation

The code now handles both scenarios:

```typescript
// In /api/research/route.ts and /api/refinement/route.ts
if (typeof (globalThis as any).waitUntil === 'function') {
  // Use Vercel's waitUntil (Pro plan or Edge Runtime)
  (globalThis as any).waitUntil(performResearch(sessionId, prompt));
} else {
  // Fallback: Call webhook endpoint
  triggerResearchWebhook(sessionId, prompt);
}
```

The webhook calls `/api/process-research` with `maxDuration: 300`, giving it up to 5 minutes to complete.

## Next Steps

1. **Choose deployment platform** (Railway recommended for simplicity)
2. **Deploy backend**
3. **Test full research flow**
4. **Record video walkthrough**
5. **Submit assessment**

All the code changes are committed and ready to deploy! 🚀
