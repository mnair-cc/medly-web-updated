/**
 * Simulates a white overlay effect on a color (like applying rgba(255,255,255,0.9) on top)
 * @param color - Hex color string (e.g., "#7CC500")
 * @param overlayAlpha - Opacity of the white overlay (0-1, default 0.9)
 * @returns Hex color string with white overlay applied
 */
export function applyWhiteOverlay(color: string, overlayAlpha: number = 0.9): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Simulate white overlay: blend original color with white using alpha
    const whiteR = 255;
    const whiteG = 255;
    const whiteB = 255;

    // Alpha blending formula: result = overlay * alpha + background * (1 - alpha)
    const newR = Math.round(whiteR * overlayAlpha + r * (1 - overlayAlpha));
    const newG = Math.round(whiteG * overlayAlpha + g * (1 - overlayAlpha));
    const newB = Math.round(whiteB * overlayAlpha + b * (1 - overlayAlpha));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Applies a black overlay effect on a color (like applying rgba(0,0,0,alpha) on top)
 * @param color - Hex color string (e.g., "#7CC500")
 * @param overlayAlpha - Opacity of the black overlay (0-1)
 * @returns Hex color string with black overlay applied
 */
export function applyBlackOverlay(color: string, overlayAlpha: number): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Simulate black overlay: blend original color with black using alpha
    const blackR = 0;
    const blackG = 0;
    const blackB = 0;

    // Alpha blending formula: result = overlay * alpha + background * (1 - alpha)
    const newR = Math.round(blackR * overlayAlpha + r * (1 - overlayAlpha));
    const newG = Math.round(blackG * overlayAlpha + g * (1 - overlayAlpha));
    const newB = Math.round(blackB * overlayAlpha + b * (1 - overlayAlpha));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Applies a custom color overlay effect
 * @param baseColor - Base hex color string
 * @param overlayColor - Overlay hex color string
 * @param overlayAlpha - Opacity of the overlay (0-1)
 * @returns Hex color string with overlay applied
 */
export function applyColorOverlay(baseColor: string, overlayColor: string, overlayAlpha: number): string {
    // Convert base color hex to RGB
    const baseHex = baseColor.replace('#', '');
    const baseR = parseInt(baseHex.substr(0, 2), 16);
    const baseG = parseInt(baseHex.substr(2, 2), 16);
    const baseB = parseInt(baseHex.substr(4, 2), 16);

    // Convert overlay color hex to RGB
    const overlayHex = overlayColor.replace('#', '');
    const overlayR = parseInt(overlayHex.substr(0, 2), 16);
    const overlayG = parseInt(overlayHex.substr(2, 2), 16);
    const overlayB = parseInt(overlayHex.substr(4, 2), 16);

    // Alpha blending formula: result = overlay * alpha + background * (1 - alpha)
    const newR = Math.round(overlayR * overlayAlpha + baseR * (1 - overlayAlpha));
    const newG = Math.round(overlayG * overlayAlpha + baseG * (1 - overlayAlpha));
    const newB = Math.round(overlayB * overlayAlpha + baseB * (1 - overlayAlpha));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
