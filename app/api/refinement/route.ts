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
