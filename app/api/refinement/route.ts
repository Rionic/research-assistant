import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, SubmitRefinementRequest, SubmitRefinementResponse } from '@/types';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body: SubmitRefinementRequest = await request.json();
    const { sessionId, questionId, answer } = body;

    if (!sessionId || !questionId || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session from Firestore
    const sessionRef = adminDb.collection('research_sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      );
    }

    const session = sessionDoc.data() as ResearchSession;

    // Update the question with the answer
    const updatedQuestions = session.refinementQuestions.map(q =>
      q.id === questionId ? { ...q, answer } : q
    );

    await sessionRef.update({
      refinementQuestions: updatedQuestions,
      updatedAt: new Date(),
    });

    // Check if all questions are answered
    const allAnswered = updatedQuestions.every(q => q.answer);

    if (allAnswered) {
      // Generate refined prompt
      const questionsAndAnswers = updatedQuestions
        .map(q => `Q: ${q.question}\nA: ${q.answer}`)
        .join('\n\n');

      const refinedPrompt = `${session.initialPrompt}\n\nAdditional context:\n${questionsAndAnswers}`;

      // Update session with refined prompt and start processing
      await sessionRef.update({
        refinedPrompt,
        status: 'processing',
        updatedAt: new Date(),
      });

      // Trigger background research processes
      // In production, use a queue system or cloud functions
      // For now, we'll use Promise.all (not ideal for long-running tasks)
      performResearch(sessionId, refinedPrompt);

      const response: SubmitRefinementResponse = {
        sessionId,
        status: 'processing',
        refinedPrompt,
      };

      return NextResponse.json(response);
    } else {
      // Find next unanswered question
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
    return NextResponse.json(
      { error: 'Failed to submit refinement' },
      { status: 500 }
    );
  }
}

// Background research function
async function performResearch(sessionId: string, refinedPrompt: string) {
  const sessionRef = adminDb.collection('research_sessions').doc(sessionId);

  try {
    // Run both research tasks in parallel
    const [openaiResult, geminiResult] = await Promise.all([
      performOpenAIResearch(refinedPrompt),
      performGeminiResearch(refinedPrompt),
    ]);

    // Update session with results
    await sessionRef.update({
      openaiResult,
      geminiResult,
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    // Get updated session data
    const sessionDoc = await sessionRef.get();
    const session = sessionDoc.data() as ResearchSession;

    // Generate and send PDF report
    await generateAndEmailReport(session);

    // Update status to email_sent
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
    model: 'o3-deep-research',
    messages: [
      {
        role: 'system',
        content: 'You are a thorough research assistant. Provide comprehensive research findings with sources and citations.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content || '';
}

async function performGeminiResearch(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function generateAndEmailReport(session: ResearchSession) {
  const { sendResearchReport } = await import('@/lib/email-sender');
  await sendResearchReport(session);
}
