import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, SubmitRefinementRequest, SubmitRefinementResponse } from '@/types';
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
    const body: SubmitRefinementRequest = await request.json();
    const { sessionId, questionId, answer } = body;

    if (!sessionId || !questionId || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sessionRef = adminDb.collection('research_sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Research session not found' }, { status: 404 });
    }

    const session = sessionDoc.data() as ResearchSession;

    const updatedQuestions = session.refinementQuestions.map(q =>
      q.id === questionId ? { ...q, answer } : q
    );

    await sessionRef.update({
      refinementQuestions: updatedQuestions,
      updatedAt: new Date(),
    });

    const allAnswered = updatedQuestions.every(q => q.answer);

    if (allAnswered) {
      const questionsAndAnswers = updatedQuestions
        .map(q => `Q: ${q.question}\nA: ${q.answer}`)
        .join('\n\n');

      const refinedPrompt = `${session.initialPrompt}\n\nAdditional context:\n${questionsAndAnswers}`;

      await sessionRef.update({
        refinedPrompt,
        status: 'processing',
        updatedAt: new Date(),
      });

      // Use Vercel's waitUntil to keep function alive for background work
      if (typeof (globalThis as any).waitUntil === 'function') {
        (globalThis as any).waitUntil(performResearch(sessionId, refinedPrompt));
      } else {
        // Fallback: call webhook to trigger research externally
        triggerResearchWebhook(sessionId, refinedPrompt);
      }

      return NextResponse.json({
        sessionId,
        status: 'processing',
        refinedPrompt,
      });
    } else {
      const nextQuestion = updatedQuestions.find(q => !q.answer);

      return NextResponse.json({
        sessionId,
        status: 'refining',
        nextQuestion,
      });
    }
  } catch (error) {
    console.error('Error submitting refinement:', error);
    return NextResponse.json({ error: 'Failed to submit refinement' }, { status: 500 });
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
