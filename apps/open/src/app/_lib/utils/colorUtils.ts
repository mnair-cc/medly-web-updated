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
 * Applies a greying overlay effect on a color (like applying a grey tint on top)
 * @param color - Hex color string (e.g., "#7CC500")
 * @param overlayAlpha - Opacity of the grey overlay (0-1)
 * @returns Hex color string with grey overlay applied
 */
export function applyBlackOverlay(color: string, overlayAlpha: number = 0.85): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Use a light grey (off-white) for a subtle muted effect
    const greyR = 200;
    const greyG = 200;
    const greyB = 200;

    // Alpha blending formula: result = overlay * alpha + background * (1 - alpha)
    const newR = Math.round(greyR * overlayAlpha + r * (1 - overlayAlpha));
    const newG = Math.round(greyG * overlayAlpha + g * (1 - overlayAlpha));
    const newB = Math.round(greyB * overlayAlpha + b * (1 - overlayAlpha));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Desaturates a color by blending it towards its grey equivalent
 * @param color - Hex color string (e.g., "#7CC500")
 * @param amount - Amount to desaturate (0-1, where 1 is fully grey)
 * @returns Hex color string with reduced saturation
 */
export function desaturate(color: string, amount: number): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate the grey value (luminance-based for perceptual accuracy)
    const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // Blend towards grey
    const newR = Math.round(r + (grey - r) * amount);
    const newG = Math.round(g + (grey - g) * amount);
    const newB = Math.round(b + (grey - b) * amount);

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
