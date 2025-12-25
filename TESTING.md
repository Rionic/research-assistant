# Testing Guide

## Quick Start

Run the comprehensive backend test suite:

```bash
npm run test:flow
```

This will test all backend components in sequence and provide detailed output.

## Prerequisites

Before running tests, ensure you have:

1. **Created `.env.local`** with all required API keys:
   ```bash
   cp .env.example .env.local
   ```

2. **Filled in all API keys** in `.env.local`:
   - `OPENAI_API_KEY` - From https://platform.openai.com/api-keys
   - `GEMINI_API_KEY` - From https://makersuite.google.com/app/apikey
   - `SENDGRID_API_KEY` - From https://app.sendgrid.com/settings/api_keys
   - `SENDGRID_FROM_EMAIL` - Your verified SendGrid sender email
   - Firebase credentials (from Firebase Console)

3. **Installed dependencies**:
   ```bash
   npm install
   ```

## What Gets Tested

The test script validates:

### 1. Environment Variables ✅
- Checks all required API keys are present
- Validates configuration completeness

### 2. OpenAI API ✅
- Tests basic OpenAI connectivity with GPT-4
- Attempts to use `o3-deep-research` model
- Falls back to `o4-mini-deep-research` if needed
- Provides alternative model suggestions if models are unavailable

### 3. Google Gemini API ✅
- Tests Gemini Pro model connectivity
- Validates API key permissions
- Generates sample research content

### 4. PDF Generation ✅
- Creates a test PDF document
- Tests multi-line content handling
- Validates buffer output

### 5. Email Sending ✅
- Sends test email via SendGrid
- Includes HTML formatting
- Attaches PDF if available
- Validates sender email configuration

### 6. Full End-to-End Flow ✅
- Simulates complete research session
- Generates refinement questions
- Runs parallel OpenAI + Gemini research
- Creates PDF report
- Sends email with attachment

## Expected Output

### Success Case
```
🔬 Multi-API Deep Research Assistant - Backend Test
Testing all backend components...

============================================================
Testing Environment Variables
============================================================
✅ OPENAI_API_KEY is set
✅ GEMINI_API_KEY is set
✅ SENDGRID_API_KEY is set
✅ SENDGRID_FROM_EMAIL is set

============================================================
Testing OpenAI API
============================================================
ℹ️  Testing basic GPT-4 model first...
✅ Basic OpenAI API connection works
ℹ️  Response: API test successful

ℹ️  Testing o3-deep-research model...
✅ o3-deep-research model is accessible!

[... more tests ...]

============================================================
Test Summary
============================================================

✅ Env Vars
✅ Openai
✅ Gemini
✅ Pdf
✅ Email
✅ Full Flow

============================================================

🎉 ALL TESTS PASSED! (6/6)

Your backend is fully configured and ready to go!

Next steps:
  1. Build the frontend UI
  2. Add authentication middleware
  3. Deploy to Vercel
```

### Failure Cases

If tests fail, you'll see clear error messages and suggestions:

```
❌ o3-deep-research model not found
⚠️  This model might require beta access or might not exist yet
ℹ️  Available alternatives: gpt-4-turbo, gpt-4, gpt-3.5-turbo
```

## Common Issues & Fixes

### OpenAI Model Not Found

**Problem:** `o3-deep-research` returns 404

**Solutions:**
1. Model might require beta access - contact OpenAI
2. Model name might be different - check OpenAI documentation
3. Use alternatives: `gpt-4-turbo`, `gpt-4`, or `o4-mini-deep-research`

**Fix:** Update `/app/api/research/route.ts` and `/app/api/refinement/route.ts` to use available model

### SendGrid Permission Denied

**Problem:** Email sending fails with 403 error

**Solutions:**
1. Verify sender email at https://app.sendgrid.com/settings/sender_auth/senders
2. Check API key has "Mail Send" permission
3. Ensure not using restricted SendGrid account

### Gemini API Key Invalid

**Problem:** `API_KEY_INVALID` error

**Solutions:**
1. Get new key from https://makersuite.google.com/app/apikey
2. Ensure no spaces or quotes in `.env.local`
3. Verify key has Gemini API enabled

## Running Individual Tests

The test script runs all tests sequentially. To test specific components:

### Test OpenAI Only
Edit `scripts/test-flow.ts` and comment out other test calls in `main()`:
```typescript
async function main() {
  await testEnvironmentVariables();
  await testOpenAI();
  // await testGemini();
  // await testPDFGeneration();
  // ...
}
```

### Test Email Only
```typescript
async function main() {
  await testEnvironmentVariables();
  const pdfBuffer = await testPDFGeneration();
  await testEmailSending(pdfBuffer);
}
```

## Debugging

For more verbose output, add console logs:

```typescript
// In test-flow.ts
console.log('Full error:', JSON.stringify(error, null, 2));
```

## Next Steps After All Tests Pass

Once all tests are green:

1. ✅ Backend is fully configured
2. 🎯 Build frontend UI
3. 🔒 Add authentication middleware
4. 🚀 Deploy to Vercel
5. 📊 Add monitoring and logging

## Production Considerations

Before deploying:

- [ ] Replace test email with actual user emails
- [ ] Implement proper error handling
- [ ] Add retry logic with exponential backoff
- [ ] Use background job queue for long-running research
- [ ] Set up monitoring (Sentry, LogRocket, etc.)
- [ ] Add rate limiting
- [ ] Implement proper authentication
- [ ] Store PDFs in cloud storage (not in memory)

## Test Data

The test script uses:
- **Test prompt:** "What are the latest developments in quantum computing?"
- **Mock refinement answers:** Time period (last 2 years), Focus (hardware)
- **Test email recipient:** Your SENDGRID_FROM_EMAIL (sends to yourself)
