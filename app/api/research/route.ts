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
    // Parse request body
    const body: StartResearchRequest = await request.json();
    const { prompt } = body;

    // TODO: Get authenticated user from session/token
    // For now, we'll need to pass user info from the client
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Research prompt is required' },
        { status: 400 }
      );
    }

    // Create research session in Firestore
    const sessionRef = adminDb.collection('research_sessions').doc();
    const sessionId = sessionRef.id;

    // Step 1: Call OpenAI to get refinement questions
    const refinementQuestions = await getRefinementQuestions(prompt);

    // If no refinement questions, trigger immediate research
    if (refinementQuestions.length === 0) {
      const session: ResearchSession = {
        id: sessionId,
        userId,
        userEmail,
        initialPrompt: prompt,
        refinedPrompt: prompt, // No refinement, use original prompt
        refinementQuestions: [],
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await sessionRef.set(session);

      // Trigger background research with original prompt
      performResearch(sessionId, prompt);

      const response: StartResearchResponse = {
        sessionId,
        status: 'processing',
        refinementQuestions: [],
      };

      return NextResponse.json(response);
    }

    // Create initial session document with refinement questions
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
  } catch (error) {
    console.error('Error starting research:', error);
    return NextResponse.json(
      { error: 'Failed to start research session' },
      { status: 500 }
    );
  }
}

// Get refinement questions from OpenAI
async function getRefinementQuestions(prompt: string) {
  try {
    console.log('🔍 Attempting to get refinement questions from OpenAI...');

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

    console.log('✅ OpenAI refinement questions generated successfully');
    const response = completion.choices[0].message.content || '';

    // Check if refinement is needed
    if (response.includes('NO_REFINEMENT_NEEDED')) {
      return [];
    }

    // Parse questions
    const questionLines = response
      .split('\n')
      .filter(line => line.trim().length > 0 && /^\d+[.)]\s+/.test(line.trim()));

    return questionLines.map((line, index) => ({
      id: `q${index + 1}`,
      question: line.replace(/^\d+[.)]\s+/, '').trim(),
    }));
  } catch (error: any) {
    console.error('❌ Error getting refinement questions:', error);
    console.error('Error details:', {
      status: error?.status,
      code: error?.code,
      type: error?.type,
      message: error?.message
    });

    // Try to list available models to help debug
    try {
      console.log('🔍 Attempting to list available OpenAI models...');
      const models = await openai.models.list();
      const chatModels = models.data
        .filter((m: any) => m.id.includes('gpt') || m.id.includes('turbo'))
        .map((m: any) => m.id);
      console.log('📋 Available chat models:', chatModels);
    } catch (listError) {
      console.error('Could not list models:', listError);
    }

    return []; // If error, proceed without refinement
  }
}

// Background research function (same as in refinement route)
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

// Perform OpenAI deep research
async function performOpenAIResearch(prompt: string): Promise<string> {
  console.log('🤖 Starting OpenAI research...');
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

  console.log('✅ OpenAI research completed');
  return completion.choices[0].message.content || '';
}

// Perform Gemini research
async function performGeminiResearch(prompt: string): Promise<string> {
  console.log('🔮 Starting Gemini research...');
  const response = await geminiAI.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
  });

  console.log('✅ Gemini research completed');
  return response.text || '';
}

async function generateAndEmailReport(session: ResearchSession) {
  const { sendResearchReport } = await import('@/lib/email-sender');
  await sendResearchReport(session);
}
