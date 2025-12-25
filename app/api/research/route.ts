import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, StartResearchRequest, StartResearchResponse } from '@/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    // TODO: Upgrade to o3-deep-research when available
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Before conducting research, ask 2-3 clarifying questions to refine the research scope and objectives.',
        },
        {
          role: 'user',
          content: `I want to research: ${prompt}\n\nWhat clarifying questions do you have to better understand my research needs?`,
        },
      ],
    });

    const refinementQuestionsText = completion.choices[0].message.content || '';

    // Parse questions (simple approach - split by newlines and filter)
    const questionLines = refinementQuestionsText
      .split('\n')
      .filter(line => line.trim().length > 0 && /^\d+[.)]\s+/.test(line.trim()));

    const refinementQuestions = questionLines.map((line, index) => ({
      id: `q${index + 1}`,
      question: line.replace(/^\d+[.)]\s+/, '').trim(),
    }));

    // Create initial session document
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
