// Deterministic short slug for a lessonId, safe for cookie keys
export function lessonSlug(lessonId: string): string {
  // FNV-1a 32-bit
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < lessonId.length; i++) {
    hash ^= lessonId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // 6-char base36 slug; pad to ensure fixed width
  return (hash >>> 0).toString(36).padStart(6, "0").slice(0, 6);
}


