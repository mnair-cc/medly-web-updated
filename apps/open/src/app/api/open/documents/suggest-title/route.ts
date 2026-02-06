import { NextRequest, NextResponse } from 'next/server';
import { suggestTitle } from '@/app/(protected)/open/_ai/suggestTitle';

/**
 * POST /api/open/documents/suggest-title
 * Suggests a title for a document based on its content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required', status: 'error' },
        { status: 400 }
      );
    }

    // Use AI to suggest a title
    const title = await suggestTitle(text);

    return NextResponse.json({
      status: 'success',
      title,
    });
  } catch (error) {
    console.error('Error in suggest-title API route:', error);
    // Return "New Document" fallback on any error
    return NextResponse.json(
      { status: 'error', error: 'Failed to suggest title', title: 'New Document' },
      { status: 200 } // Return 200 so caller can use fallback title
    );
  }
}
