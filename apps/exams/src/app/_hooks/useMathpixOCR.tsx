import { useState, useCallback } from 'react';

interface MathpixResult {
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

interface UseMathpixOCRReturn {
    processStrokes: (canvasData: any, expressionIndex?: number) => Promise<MathpixResult | null>;
    isLoading: boolean;
    error: string | null;
    lastResult: MathpixResult | null;
}

export const useMathpixOCR = (): UseMathpixOCRReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<MathpixResult | null>(null);

    // Function to transform canvas paths to Mathpix format
    const transformCanvasPathsToMathpix = (canvasData: any) => {
        // console.log('🔄 Transforming canvas data:', canvasData);
        const x: number[][] = [];
        const y: number[][] = [];

        // Handle the canvas data structure from exportPaths()
        if (canvasData.paths && Array.isArray(canvasData.paths)) {
            canvasData.paths.forEach((stroke: any) => {
                if (stroke.paths && Array.isArray(stroke.paths) && stroke.paths.length > 0) {
                    const strokeX: number[] = [];
                    const strokeY: number[] = [];

                    stroke.paths.forEach((point: { x: number, y: number }) => {
                        strokeX.push(point.x);
                        strokeY.push(point.y);
                    });

                    if (strokeX.length > 0 && strokeY.length > 0) {
                        x.push(strokeX);
                        y.push(strokeY);
                    }
                }
            });
        }
        // Handle direct point array (legacy single stroke format)
        else if (Array.isArray(canvasData) && canvasData.length > 0 && canvasData[0].x !== undefined) {
            const strokeX: number[] = [];
            const strokeY: number[] = [];

            canvasData.forEach((point: { x: number, y: number }) => {
                strokeX.push(point.x);
                strokeY.push(point.y);
            });

            if (strokeX.length > 0 && strokeY.length > 0) {
                x.push(strokeX);
                y.push(strokeY);
            }
        }

        const result = {
            strokes: {
                strokes: { x, y }
            }
        };

        // console.log('✅ Transformed to Mathpix format:', result, 'Total strokes:', x.length);
        return result;
    };

    const processStrokes = useCallback(async (canvasData: any, expressionIndex?: number): Promise<MathpixResult | null> => {
        try {
            setIsLoading(true);
            setError(null);

            // console.log('🔍 Processing strokes with Mathpix API:', { canvasData, expressionIndex });

            const mathpixData = transformCanvasPathsToMathpix(canvasData);
            // console.log('🔄 Transformed data for Mathpix:', mathpixData);

            // Only proceed if we have actual stroke data
            if (!mathpixData.strokes.strokes.x.length) {
                // console.log('⚠️ No stroke data to send to Mathpix');
                return null;
            }

            const response = await fetch('/api/mathpix/strokes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mathpixData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Failed to process handwriting';
                setError(errorMessage);
                console.error('❌ Mathpix API error:', errorData);
                return null;
            }

            const result: MathpixResult = await response.json();
            setLastResult(result);

            // console.log('✅ Mathpix OCR Result:', {
            //     expressionIndex,
            //     result,
            //     latex: result.latex_styled,
            //     confidence: result.confidence,
            //     timestamp: new Date().toISOString()
            // });

            return result;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('❌ Error calling Mathpix API:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        processStrokes,
        isLoading,
        error,
        lastResult
    };
};