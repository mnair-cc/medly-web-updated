import { NextRequest, NextResponse } from 'next/server';

interface StrokeData {
    x: number[][];
    y: number[][];
}

interface MathpixStrokesRequest {
    strokes: {
        strokes: StrokeData;
    };
    strokes_session_id?: string;
}

interface MathpixStrokesResponse {
    request_id: string;
    is_printed: boolean;
    is_handwritten: boolean;
    auto_rotate_confidence: number;
    auto_rotate_degrees: number;
    confidence: number;
    confidence_rate: number;
    latex_styled: string;
    text: string;
    version: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: MathpixStrokesRequest = await request.json();

        // Validate required fields
        if (!body.strokes || !body.strokes.strokes) {
            return NextResponse.json(
                { error: 'Missing required strokes data' },
                { status: 400 }
            );
        }

        // Get API credentials from environment variables
        const appId = process.env.MATHPIX_APP_ID;
        const appKey = process.env.MATHPIX_APP_KEY;

        if (!appId || !appKey) {
            console.error('Missing Mathpix API credentials');
            return NextResponse.json(
                { error: 'API credentials not configured' },
                { status: 500 }
            );
        }

        // Prepare the request to Mathpix API
        const mathpixResponse = await fetch('https://api.mathpix.com/v3/strokes', {
            method: 'POST',
            headers: {
                'app_id': appId,
                'app_key': appKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!mathpixResponse.ok) {
            const errorText = await mathpixResponse.text();
            console.error('Mathpix API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to process handwriting' },
                { status: mathpixResponse.status }
            );
        }

        const result: MathpixStrokesResponse = await mathpixResponse.json();

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error processing strokes:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}