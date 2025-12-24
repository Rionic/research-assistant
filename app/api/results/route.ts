import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ResearchSession, ResearchResultsResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    const response: ResearchResultsResponse = {
      sessionId: session.id,
      status: session.status,
      openaiResult: session.openaiResult,
      geminiResult: session.geminiResult,
      pdfUrl: session.pdfUrl,
      error: session.error,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}
