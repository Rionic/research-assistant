import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, SubmitRefinementRequest, SubmitRefinementResponse } from '@/types';
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

      performResearch(sessionId, refinedPrompt);

      const response: SubmitRefinementResponse = {
        sessionId,
        status: 'processing',
        refinedPrompt,
      };

      return NextResponse.json(response);
    } else {
      const nextQuestion = updatedQuestions.find(q => !q.answer);

      const response: SubmitRefinementResponse = {
        sessionId,
        status: 'refining',
        nextQuestion,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Error submitting refinement:', error);
    return NextResponse.json({ error: 'Failed to submit refinement' }, { status: 500 });
  }
}

async function performResearch(sessionId: string, refinedPrompt: string) {
  const sessionRef = adminDb.collection('research_sessions').doc(sessionId);

  try {
    const [openaiResult, geminiResult] = await Promise.all([
      performOpenAIResearch(refinedPrompt),
      performGeminiResearch(refinedPrompt),
    ]);

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
  } catch (error) {
    console.error('Error performing research:', error);
    await sessionRef.update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date(),
    });
  }
}

async function performOpenAIResearch(prompt: string): Promise<string> {
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

  return completion.choices[0].message.content || '';
}

async function performGeminiResearch(prompt: string): Promise<string> {
  const response = await geminiAI.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
  });

  return response.text || '';
}

async function generateAndEmailReport(session: ResearchSession) {
  const { sendResearchReport } = await import('@/lib/email-sender');
  await sendResearchReport(session);
}
