import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, StartResearchRequest, StartResearchResponse } from '@/types';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getGeminiAI() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ''
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: StartResearchRequest = await request.json();
    const { prompt } = body;

    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Research prompt is required' }, { status: 400 });
    }

    const sessionRef = adminDb.collection('research_sessions').doc();
    const sessionId = sessionRef.id;

    const refinementQuestions = await getRefinementQuestions(prompt);

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

      // Use Vercel's waitUntil to keep function alive for background work
      if (typeof (globalThis as any).waitUntil === 'function') {
        (globalThis as any).waitUntil(performResearch(sessionId, prompt));
      } else {
        // Fallback: call webhook to trigger research externally
        triggerResearchWebhook(sessionId, prompt);
      }

      return NextResponse.json({
        sessionId,
        status: 'processing',
        refinementQuestions: [],
      });
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

    return NextResponse.json({
      sessionId,
      status: 'refining',
      refinementQuestions,
    });
  } catch (error: any) {
    console.error('Error starting research:', error);
    return NextResponse.json({
      error: 'Failed to start research session',
      details: error?.message
    }, { status: 500 });
  }
}

async function getRefinementQuestions(prompt: string) {
  try {
    const completion = await getOpenAI().chat.completions.create({
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
    console.log('Starting research for session:', sessionId);

    const openaiResult = await performOpenAIResearch(refinedPrompt);
    const geminiResult = await performGeminiResearch(refinedPrompt);

    await sessionRef.update({
      openaiResult,
      geminiResult,
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    const sessionDoc = await sessionRef.get();
    const session = sessionDoc.data() as ResearchSession;

    await generateAndEmailReport(session);

    await sessionRef.update({
      status: 'email_sent',
      emailSentAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Research completed successfully for session:', sessionId);
  } catch (error) {
    console.error('Error in performResearch:', error);

    try {
      await sessionRef.update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      });
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
  }
}

async function performOpenAIResearch(prompt: string): Promise<string> {
  const completion = await getOpenAI().chat.completions.create({
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

  return completion.choices[0].message.content || '';
}

async function performGeminiResearch(prompt: string): Promise<string> {
  const response = await getGeminiAI().models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
  });

  return response.text || '';
}

async function generateAndEmailReport(session: ResearchSession) {
  const { sendResearchReport } = await import('@/lib/email-sender');
  await sendResearchReport(session);
}

// Trigger research via external webhook (fallback for platforms without waitUntil)
function triggerResearchWebhook(sessionId: string, prompt: string) {
  // Make a non-blocking fetch call to trigger research processing
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  fetch(`${apiUrl}/api/process-research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, prompt }),
  }).catch(err => {
    console.error('[WEBHOOK] Failed to trigger research webhook:', err);
    // Research will remain in 'processing' state - user can retry
  });
}
