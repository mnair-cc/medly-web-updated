import { Canvas, TextboxData } from "@/app/types/types";

/**
 * Transform canvas data from API response to client-side format
 * Maps snake_case properties (is_math, font_size) to camelCase (isMath, fontSize)
 */
export function transformCanvas(canvas: any): Canvas {
  if (!canvas || typeof canvas !== "object") {
    return { paths: [], textboxes: [], maths: [] };
  }

  return {
    paths: canvas.paths || [],
    textboxes: (canvas.textboxes || []).map((textbox: any) => ({
      text: textbox.text || "",
      x: textbox.x || 0,
      y: textbox.y || 0,
      fontSize: textbox.font_size ?? textbox.fontSize ?? 16,
      color: textbox.color || "#000000",
      isMath: textbox.is_math ?? textbox.isMath ?? false,
    })) as TextboxData[],
    maths: canvas.maths || [],
    stemPaths: canvas.stem_paths || canvas.stemPaths || [],
  };
}
