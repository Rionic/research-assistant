// User types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

// Research session status
export type ResearchStatus =
  | 'pending'           // Initial state
  | 'refining'          // OpenAI refinement questions in progress
  | 'processing'        // Both APIs running research
  | 'completed'         // Research completed, PDF generated
  | 'failed'            // Error occurred
  | 'email_sent';       // Final state - email delivered

// OpenAI refinement question
export interface RefinementQuestion {
  id: string;
  question: string;
  answer?: string;
}

// Research session data stored in Firestore
export interface ResearchSession {
  id: string;
  userId: string;
  userEmail: string;

  // Research query
  initialPrompt: string;
  refinedPrompt?: string;

  // OpenAI refinement flow
  refinementQuestions: RefinementQuestion[];

  // Research results
  openaiResult?: string;
  geminiResult?: string;

  // Metadata
  status: ResearchStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // PDF and email
  pdfUrl?: string;
  emailSentAt?: Date;

  // Error tracking
  error?: string;
}

// API request/response types
export interface StartResearchRequest {
  prompt: string;
}

export interface StartResearchResponse {
  sessionId: string;
  status: ResearchStatus;
  refinementQuestions?: RefinementQuestion[];
}

export interface SubmitRefinementRequest {
  sessionId: string;
  questionId: string;
  answer: string;
}

export interface SubmitRefinementResponse {
  sessionId: string;
  status: ResearchStatus;
  nextQuestion?: RefinementQuestion;
  refinedPrompt?: string; // Set when all questions answered
}

export interface ResearchResultsResponse {
  sessionId: string;
  status: ResearchStatus;
  openaiResult?: string;
  geminiResult?: string;
  pdfUrl?: string;
  error?: string;
}

// OpenAI Deep Research API types
export interface OpenAIDeepResearchMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIDeepResearchResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIDeepResearchMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Gemini API types
export interface GeminiResearchResponse {
  text: string;
  sources?: string[];
}
