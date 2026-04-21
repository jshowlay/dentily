/** Remove long dashes that read as templated AI tone. */
export function stripLongDashes(s: string): string {
  return s
    .replace(/\u2014/g, ".")
    .replace(/\u2013/g, ".")
    .replace(/\s*-\s*-\s*/g, ". ");
}

/**
 * Drop duplicate sentences (case-insensitive) to fix mail-merge double hooks.
 * Also catches "I noticed ... reviews." twice when split by punctuation.
 */
export function dedupeSentencesInOutreach(s: string): string {
  const t = stripLongDashes(s).trim();
  if (!t) return t;
  const parts = t.split(/(?<=[.!?])\s+/).map((p) => p.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const key = p.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

/** True if any 5-word span appears twice (word-level, case-insensitive). */
export function hasDuplicateFiveWordSpan(s: string): boolean {
  const words = stripLongDashes(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 10) return false;
  for (let len = 5; len <= Math.min(20, Math.floor(words.length / 2)); len++) {
    for (let i = 0; i + len * 2 <= words.length; i++) {
      const span = words.slice(i, i + len).join(" ");
      for (let j = i + len; j + len <= words.length; j++) {
        const span2 = words.slice(j, j + len).join(" ");
        if (span === span2) return true;
      }
    }
  }
  return false;
}
