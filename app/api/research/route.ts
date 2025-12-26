import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, StartResearchRequest, StartResearchResponse } from '@/types';
import { mockGetRefinementQuestions } from '@/lib/mockApi';

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

    // Step 1: Call OpenAI (mock) to get refinement questions
    // TODO: Upgrade to real o3-deep-research when credits available
    const refinementQuestions = await mockGetRefinementQuestions(prompt);

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

// Background research function (same as in refinement route)
async function performResearch(sessionId: string, refinedPrompt: string) {
  const { mockParallelResearch } = await import('@/lib/mockApi');
  const sessionRef = adminDb.collection('research_sessions').doc(sessionId);

  try {
    // Run both research tasks in parallel
    const { openaiResult, geminiResult } = await mockParallelResearch(refinedPrompt);

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

async function generateAndEmailReport(session: ResearchSession) {
  const { sendResearchReport } = await import('@/lib/email-sender');
  await sendResearchReport(session);
}
