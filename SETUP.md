# Multi-API Deep Research Assistant - Setup Guide

## Overview
This project is a full-stack application that performs deep research using both OpenAI's Deep Research API (o3-deep-research) and Google's Gemini API.

## Architecture

### Frontend (Next.js App Router)
- **Authentication**: Firebase Auth with Google OAuth
- **UI Framework**: React 19 + TypeScript + Tailwind CSS
- **State Management**: React hooks + Firebase Firestore real-time listeners

### Backend (Next.js API Routes)
- **Database**: Firebase Firestore
- **Email**: SendGrid
- **PDF Generation**: jsPDF
- **APIs**: OpenAI (o3-deep-research), Google Gemini

## File Structure

```
research-assistant/
├── app/
│   ├── api/
│   │   ├── research/        # POST - Start new research session
│   │   ├── refinement/      # POST - Submit refinement answers
│   │   └── results/         # GET - Fetch research results
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── firebase.ts          # Client-side Firebase config
│   ├── firebase-admin.ts    # Server-side Firebase Admin
│   ├── pdf-generator.ts     # PDF report generation
│   └── email-sender.ts      # SendGrid email functionality
├── types/
│   └── index.ts             # TypeScript interfaces
└── .env.example             # Environment variables template
```

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required variables:
- **Firebase Client**: Get from Firebase Console > Project Settings
- **Firebase Admin**: Download service account key from Firebase Console
- **OpenAI API Key**: Get from OpenAI platform
- **Gemini API Key**: Get from Google AI Studio
- **SendGrid**: Create account and verify sender email

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Setup
1. Create a Firebase project
2. Enable Google Authentication
3. Create Firestore database
4. Download service account credentials

### 4. SendGrid Setup
1. Create SendGrid account
2. Verify sender email address
3. Generate API key with Mail Send permissions

## API Flow

### Research Session Flow

1. **Start Research** (`POST /api/research`)
   - User submits research prompt
   - OpenAI generates 2-3 refinement questions
   - Session created with status: `refining`

2. **Submit Refinements** (`POST /api/refinement`)
   - User answers each refinement question
   - When all answered, status changes to: `processing`
   - Triggers parallel research execution

3. **Research Execution** (Background)
   - OpenAI Deep Research with refined prompt
   - Gemini Research with same refined prompt
   - Status changes to: `completed`

4. **Report Generation** (Background)
   - Generate PDF with both results
   - Send email with PDF attachment
   - Status changes to: `email_sent`

5. **Check Results** (`GET /api/results?sessionId=xxx`)
   - Poll for status updates
   - Retrieve results when ready

## Data Model

### ResearchSession (Firestore)
```typescript
{
  id: string
  userId: string
  userEmail: string
  initialPrompt: string
  refinedPrompt?: string
  refinementQuestions: RefinementQuestion[]
  openaiResult?: string
  geminiResult?: string
  status: ResearchStatus
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  emailSentAt?: Date
  error?: string
}
```

## Development Roadmap

### Phase 1: Core Setup ✅
- [x] Project initialization
- [x] Environment configuration
- [x] Firebase setup (client + admin)
- [x] TypeScript types
- [x] API route structure
- [x] PDF generation
- [x] Email sending

### Phase 2: Frontend Development 🚧
- [ ] Authentication UI (Google sign-in)
- [ ] Dashboard with research history
- [ ] New research form
- [ ] Refinement questions UI
- [ ] Real-time status updates
- [ ] Results display
- [ ] Mobile-responsive design

### Phase 3: Backend Enhancement 🚧
- [ ] User authentication middleware
- [ ] Session validation
- [ ] Error handling & logging
- [ ] Rate limiting
- [ ] Background job queue (for long-running research)

### Phase 4: Testing & Polish 🚧
- [ ] API integration tests
- [ ] E2E testing
- [ ] Error scenarios
- [ ] Performance optimization
- [ ] Security audit

### Phase 5: Deployment 🚧
- [ ] Vercel deployment
- [ ] Environment variables setup
- [ ] Domain configuration
- [ ] Monitoring & analytics

## Important Notes

### OpenAI Deep Research API
- Using model: `o3-deep-research`
- Alternative: `o4-mini-deep-research` (faster, cheaper for dev/testing)
- The API might require special access or beta features

### Known Limitations
1. **Long-running research**: Currently using Promise.all, should use queue system for production
2. **Authentication**: Need to implement proper JWT/session middleware
3. **File storage**: PDFs generated in memory, consider cloud storage for large reports
4. **Rate limiting**: Not implemented yet
5. **Retry logic**: API calls should have exponential backoff

## Next Steps
1. Implement authentication UI
2. Build research form and refinement flow
3. Add real-time status updates with Firestore listeners
4. Test end-to-end flow
5. Deploy to Vercel

## Useful Commands
```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth (Google OAuth)
- **Email**: SendGrid
- **PDF**: jsPDF
- **AI APIs**: OpenAI (o3-deep-research), Google Gemini
- **Deployment**: Vercel (recommended)
