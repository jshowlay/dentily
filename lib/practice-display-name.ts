/** Glued secretary-of-state suffix on an otherwise normal listing name (e.g. CenterInc). */
const GLUED_ENTITY_SUFFIX_RE =
  /(Center|Clinic|Office|Group|Dental|Care|Smile|Endodontics|Orthodontics|Periodontics)(Inc|LLC|PLLC|PC|PA)\.?$/i;

/** Patient-facing listing title; fixes data glitches without generic-listing demotion. */
export function cleanPracticeDisplayName(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return raw;
  return raw.replace(GLUED_ENTITY_SUFFIX_RE, "$1").replace(/\s{2,}/g, " ").trim();
}
