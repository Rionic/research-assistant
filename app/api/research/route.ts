import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, StartResearchRequest, StartResearchResponse } from '@/types';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Research request received');
    const body: StartResearchRequest = await request.json();
    const { prompt } = body;

    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    console.log('[API] User:', userId ? 'authenticated' : 'not authenticated');

    if (!userId || !userEmail) {
      console.log('[API] Missing auth headers');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!prompt || prompt.trim().length === 0) {
      console.log('[API] Missing prompt');
      return NextResponse.json({ error: 'Research prompt is required' }, { status: 400 });
    }

    console.log('[API] Creating Firestore session...');
    const sessionRef = adminDb.collection('research_sessions').doc();
    const sessionId = sessionRef.id;
    console.log('[API] Session created:', sessionId);

    console.log('[API] Getting refinement questions...');
    const refinementQuestions = await getRefinementQuestions(prompt);
    console.log('[API] Refinement questions:', refinementQuestions.length);

    if (refinementQuestions.length === 0) {
      const session: ResearchSession = {
        id: sessionId,
        userId,
        userEmail,
        initialPrompt: prompt,
        refinedPrompt: prompt,
        refinementQuestions: [],
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await sessionRef.set(session);
      performResearch(sessionId, prompt);

      const response: StartResearchResponse = {
        sessionId,
        status: 'processing',
        refinementQuestions: [],
      };

      return NextResponse.json(response);
    }

    const session: ResearchSession = {
      id: sessionId,
      userId,
      userEmail,
      initialPrompt: prompt,
      refinementQuestions,
      status: 'refining',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await sessionRef.set(session);

    const response: StartResearchResponse = {
      sessionId,
      status: 'refining',
      refinementQuestions,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] Error starting research:', error);
    console.error('[API] Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    });
    return NextResponse.json({
      error: 'Failed to start research session',
      details: error?.message
    }, { status: 500 });
  }
}

async function getRefinementQuestions(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Analyze the user\'s research prompt and determine if you need clarifying questions. If the prompt is already clear and specific, respond with "NO_REFINEMENT_NEEDED". Otherwise, ask 2-3 concise clarifying questions to refine the research scope. Format each question on a new line starting with a number (e.g., "1. Question here").',
        },
        {
          role: 'user',
          content: `Research prompt: ${prompt}\n\nDo you need clarifying questions, or is this prompt clear enough to proceed?`,
        },
      ],
    });

    const response = completion.choices[0].message.content || '';

    if (response.includes('NO_REFINEMENT_NEEDED')) {
      return [];
    }

    const questionLines = response
      .split('\n')
      .filter(line => line.trim().length > 0 && /^\d+[.)]\s+/.test(line.trim()));

    return questionLines.map((line, index) => ({
      id: `q${index + 1}`,
      question: line.replace(/^\d+[.)]\s+/, '').trim(),
    }));
  } catch (error: any) {
    console.error('Error getting refinement questions:', error.message);
    return [];
  }
}

async function performResearch(sessionId: string, refinedPrompt: string) {
  const sessionRef = adminDb.collection('research_sessions').doc(sessionId);

  try {
    console.log('[RESEARCH] Starting research for session:', sessionId);
    console.log('[RESEARCH] Prompt length:', refinedPrompt.length);

    console.log('[RESEARCH] Calling OpenAI API...');
    const openaiResult = await performOpenAIResearch(refinedPrompt);
    console.log('[RESEARCH] OpenAI result received, length:', openaiResult.length);

    console.log('[RESEARCH] Calling Gemini API...');
    const geminiResult = await performGeminiResearch(refinedPrompt);
    console.log('[RESEARCH] Gemini result received, length:', geminiResult.length);

    console.log('[RESEARCH] Updating Firestore with results...');
    await sessionRef.update({
      openaiResult,
      geminiResult,
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('[RESEARCH] Firestore updated successfully');

    console.log('[RESEARCH] Fetching session for email...');
    const sessionDoc = await sessionRef.get();
    const session = sessionDoc.data() as ResearchSession;

    console.log('[RESEARCH] Generating and sending email report...');
    await generateAndEmailReport(session);
    console.log('[RESEARCH] Email sent successfully');

    console.log('[RESEARCH] Updating final status to email_sent...');
    await sessionRef.update({
      status: 'email_sent',
      emailSentAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('[RESEARCH] Research completed successfully for session:', sessionId);
  } catch (error) {
    console.error('[RESEARCH] ERROR in performResearch for session:', sessionId);
    console.error('[RESEARCH] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[RESEARCH] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[RESEARCH] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[RESEARCH] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    try {
      await sessionRef.update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      });
      console.log('[RESEARCH] Session marked as failed in Firestore');
    } catch (updateError) {
      console.error('[RESEARCH] Failed to update error status in Firestore:', updateError);
    }
  }
}

async function performOpenAIResearch(prompt: string): Promise<string> {
  try {
    console.log('[OPENAI] Starting OpenAI research request');
    console.log('[OPENAI] API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('[OPENAI] API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a thorough research assistant. Provide comprehensive, well-structured research findings with sources and citations. Include specific data points, trends, and actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    console.log('[OPENAI] Request successful');
    const result = completion.choices[0].message.content || '';
    console.log('[OPENAI] Result length:', result.length);
    return result;
  } catch (error) {
    console.error('[OPENAI] Error calling OpenAI API:', error);
    throw error;
  }
}

async function performGeminiResearch(prompt: string): Promise<string> {
  try {
    console.log('[GEMINI] Starting Gemini research request');
    console.log('[GEMINI] API Key present:', !!process.env.GEMINI_API_KEY);
    console.log('[GEMINI] API Key prefix:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');

    const response = await geminiAI.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    console.log('[GEMINI] Request successful');
    const result = response.text || '';
    console.log('[GEMINI] Result length:', result.length);
    return result;
  } catch (error) {
    console.error('[GEMINI] Error calling Gemini API:', error);
    throw error;
  }
}

async function generateAndEmailReport(session: ResearchSession) {
  const { sendResearchReport } = await import('@/lib/email-sender');
  await sendResearchReport(session);
}
