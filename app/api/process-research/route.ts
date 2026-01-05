import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession } from '@/types';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// Lazy initialization functions
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

// Maximum execution time on Vercel (60 seconds on Pro, 300 on Enterprise)
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, prompt } = body;

    if (!sessionId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[PROCESS-RESEARCH] Starting background research for session:', sessionId);

    // Perform the research (this runs in a separate request lifecycle)
    await performResearch(sessionId, prompt);

    return NextResponse.json({
      success: true,
      message: 'Research processing completed',
      sessionId
    });
  } catch (error) {
    console.error('[PROCESS-RESEARCH] Error:', error);
    return NextResponse.json({
      error: 'Failed to process research',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    const response = await getGeminiAI().models.generateContent({
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
