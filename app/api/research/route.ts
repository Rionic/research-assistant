import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, StartResearchRequest, StartResearchResponse } from '@/types';
import { getOpenAI, performResearch } from '@/lib/research';

export async function POST(request: NextRequest) {
  try {
    const body: StartResearchRequest = await request.json();
    const { prompt, timezone } = body;

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
        userTimezone: timezone,
        initialPrompt: prompt,
        refinedPrompt: prompt,
        refinementQuestions: [],
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await sessionRef.set(session);

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
      userTimezone: timezone,
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

