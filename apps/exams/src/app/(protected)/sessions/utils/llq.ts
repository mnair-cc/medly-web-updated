export const LLQ_COOKIE_NAME = "llq";
export const LLQ_VERSION = "v1";
export const LLQ_MAX_ENTRIES = 20;

export interface LlqEntry {
  slug: string;
  index: number;
}

// Parse llq cookie value into entries. Format: v1:slug:index|slug:index
export function parseLlq(raw: string | undefined): LlqEntry[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  const value = trimmed.startsWith(`${LLQ_VERSION}:`)
    ? trimmed.slice(LLQ_VERSION.length + 1)
    : trimmed; // tolerate missing version
  if (!value) return [];
  return value
    .split("|")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [slug, idx] = pair.split(":");
      const index = Number(idx);
      return slug && Number.isFinite(index) ? { slug, index } : null;
    })
    .filter((e): e is LlqEntry => !!e);
}

export function serializeLlq(entries: LlqEntry[]): string {
  const body = entries
    .map((e) => `${e.slug}:${e.index}`)
    .join("|");
  return `${LLQ_VERSION}:${body}`;
}

export function upsertLlq(
  raw: string | undefined,
  newEntry: LlqEntry,
  max = LLQ_MAX_ENTRIES
): string {
  const entries = parseLlq(raw);
  const without = entries.filter((e) => e.slug !== newEntry.slug);
  const updated = [newEntry, ...without].slice(0, Math.max(1, max));
  return serializeLlq(updated);
}

export function removeFromLlq(
  raw: string | undefined,
  slug: string,
  max = LLQ_MAX_ENTRIES
): string {
  const entries = parseLlq(raw).filter((e) => e.slug !== slug).slice(0, max);
  return serializeLlq(entries);
}

export function findIndexInLlq(raw: string | undefined, slug: string): number | null {
  const entries = parseLlq(raw);
  const hit = entries.find((e) => e.slug === slug);
  return hit ? hit.index : null;
}


