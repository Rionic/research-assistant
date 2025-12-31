# Multi-API Deep Research Assistant

A full-stack web application that performs deep research using both OpenAI's Deep Research API and Google's Gemini API, delivering comprehensive PDF reports via email.

## 🎯 Overview

This application allows authenticated users to:
- Submit research queries with interactive refinement using OpenAI
- Execute parallel research with both OpenAI (gpt-4o) and Google Gemini
- Receive professional PDF reports via email with results from both APIs
- Track research history with real-time status updates

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google OAuth)
- **APIs**: OpenAI (gpt-4o), Google Gemini (gemini-flash-latest)
- **Email**: SendGrid
- **PDF Generation**: jsPDF + marked (markdown parsing)

### Key Features
- **OAuth Authentication**: Secure Gmail sign-in with Firebase Auth
- **Interactive Refinement**: OpenAI analyzes prompts and asks clarifying questions
- **Parallel Research**: Executes OpenAI and Gemini research simultaneously
- **Real-time Updates**: Firestore listeners for instant status updates
- **Professional Reports**: Well-formatted PDFs with tables, lists, and proper typography
- **Email Delivery**: Automatic email with PDF attachment and summary

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- OpenAI API key with access to `gpt-4o`
- Google Gemini API key
- SendGrid account with verified sender email

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd research-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure `.env.local`** (see [Environment Setup](#environment-setup) below)

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 🔧 Environment Setup

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Google Authentication (Authentication > Sign-in method > Google)
   - Create Firestore database (Firestore Database > Create database)

2. **Get Firebase Client Credentials**
   - Project Settings > General > Your apps > Web app
   - Copy the config values to `.env.local`:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
     NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
     ```

3. **Get Firebase Admin Credentials**
   - Project Settings > Service Accounts > Generate New Private Key
   - Download the JSON file and extract these values to `.env.local`:
     ```env
     FIREBASE_ADMIN_PROJECT_ID=your-project-id
     FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
     FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_key_here\n-----END PRIVATE KEY-----\n"
     ```

4. **Create Firestore Index**
   - When you first create a research, Firestore will show an error with a link
   - Click the link to auto-generate the required composite index
   - Index fields: `userId` (ascending), `createdAt` (descending)

### OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an API key
3. Ensure your account has access to `gpt-4o` model
4. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx
   ```

### Google Gemini Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Add to `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

### SendGrid Setup

1. Go to [SendGrid](https://sendgrid.com/)
2. Create an account and verify your sender email
3. Create an API key (Settings > API Keys)
4. Add to `.env.local`:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=your-verified-email@example.com
   SENDGRID_FROM_NAME=Research Assistant
   ```

## 📱 Usage

1. **Sign In**
   - Click "Sign in with Google" on the homepage
   - Authenticate with your Gmail account

2. **Create Research**
   - Click "+ New Research" button
   - Enter your research question or topic
   - Submit and wait for AI analysis

3. **Answer Refinement Questions** (if any)
   - OpenAI may ask 2-3 clarifying questions
   - Answer each question to refine your research
   - Click "Submit & Continue Research" when done

4. **Wait for Results**
   - Both OpenAI and Gemini will research in parallel
   - Watch real-time status updates on your dashboard
   - Typical research takes 30-90 seconds

5. **Receive Email**
   - Check your Gmail for the PDF report
   - Email includes a summary and full PDF attachment
   - PDF contains results from both APIs with professional formatting

## 🏛️ Project Structure

```
research-assistant/
├── app/
│   ├── api/
│   │   ├── research/route.ts      # Initial research submission & refinement
│   │   └── refinement/route.ts    # Refinement answers & parallel execution
│   ├── dashboard/
│   │   └── page.tsx               # Main dashboard with research history
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Login page
├── components/
│   └── NewResearchModal.tsx       # Multi-step research modal
├── contexts/
│   └── AuthContext.tsx            # Firebase auth state management
├── lib/
│   ├── firebase.ts                # Firebase client SDK
│   ├── firebase-admin.ts          # Firebase Admin SDK
│   ├── email-sender.ts            # SendGrid email delivery
│   ├── pdf-generator.ts           # jsPDF report generation
│   └── mockApi.ts                 # Mock APIs for testing
├── types/
│   └── index.ts                   # TypeScript type definitions
└── .env.example                   # Environment variable template
```

## 🔒 Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- Firebase Admin private key must be kept secret
- All API keys should be rotated regularly
- Client-side Firebase config is safe to expose (uses Firebase Security Rules)

## 🎨 Design Decisions

### Why This Architecture?
- **Client-Server Separation**: Frontend handles UI/UX, backend handles API orchestration
- **Real-time Updates**: Firestore listeners provide instant feedback without polling
- **Parallel Execution**: Promise.all executes both APIs simultaneously for speed
- **Markdown Parsing**: Using `marked` library for robust PDF formatting (tables, lists, etc.)

### API Orchestration Flow
```
User Input → OpenAI Refinement → Firestore Save → Parallel Research
                                                   ├─ OpenAI (gpt-4o)
                                                   └─ Gemini (flash)
                                                         ↓
                                                   PDF Generation → Email → Update Firestore
```

## 🧪 Testing

Run the mock API test flow:
```bash
npm run test:flow
```

This simulates the entire research flow with mock data (no API costs).

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Add Environment Variables**
   - In Vercel project settings, add all variables from `.env.local`
   - Ensure Firebase Admin private key is properly escaped

4. **Deploy**
   - Vercel will auto-deploy on every push to main
   - Production URL will be provided

### Environment Variables for Production
Update `NEXT_PUBLIC_APP_URL` to your production URL:
```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 📊 Firestore Schema

### Collection: `research_sessions`
```typescript
{
  id: string;
  userId: string;
  userEmail: string;
  initialPrompt: string;
  refinedPrompt?: string;
  status: 'refining' | 'processing' | 'completed' | 'email_sent' | 'failed';
  refinementQuestions: Array<{
    question: string;
    answer?: string;
  }>;
  openaiResult?: string;
  geminiResult?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}
```

## 🤖 AI Tool Usage

This project was developed with assistance from **Claude Code** (Anthropic's CLI tool):

- **Architecture Design**: Planning the client-server separation and API orchestration flow
- **Code Generation**: Initial scaffolding of components, API routes, and utilities
- **Debugging**: Resolving Firebase composite index issues, timestamp conversion bugs
- **PDF Formatting**: Implementing markdown parsing with the `marked` library
- **Best Practices**: TypeScript typing, error handling, security considerations

The AI accelerated development by providing:
- Boilerplate code for Firebase integration
- TypeScript type definitions
- Tailwind CSS styling patterns
- API integration patterns for OpenAI and Gemini

## 📝 License

MIT

## 👤 Author

Created as a take-home assessment for full-stack developer position.
