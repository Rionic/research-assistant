export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
}

export type ResearchStatus =
  | 'pending'
  | 'refining'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'email_sent';

export interface RefinementQuestion {
  id: string;
  question: string;
  answer?: string;
}

export interface ResearchSession {
  id: string;
  userId: string;
  userEmail: string;

  initialPrompt: string;
  refinedPrompt?: string;

  refinementQuestions: RefinementQuestion[];

  openaiResult?: string;
  geminiResult?: string;

  status: ResearchStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  pdfUrl?: string;
  emailSentAt?: Date;

  error?: string;
}

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
  refinedPrompt?: string;
}

export interface ResearchResultsResponse {
  sessionId: string;
  status: ResearchStatus;
  openaiResult?: string;
  geminiResult?: string;
  pdfUrl?: string;
  error?: string;
}

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

export interface GeminiResearchResponse {
  text: string;
  sources?: string[];
}
