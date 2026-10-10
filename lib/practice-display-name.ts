/** Glued secretary-of-state suffix on an otherwise normal listing name (e.g. CenterInc). */
const GLUED_ENTITY_SUFFIX_RE =
  /(Center|Clinic|Office|Group|Dental|Care|Smile|Endodontics|Orthodontics|Periodontics)(Inc|LLC|PLLC|PC|PA)\.?$/i;

const TRAILING_ENTITY_SUFFIX_RES: RegExp[] = [
  /\s*,?\s*(DDS|DMD)\s+PC\.?$/i,
  /\s*,?\s*(LLC|PLLC|PC|PA|Inc)\.?$/i,
];

/** Patient-facing listing title; fixes data glitches without generic-listing demotion. */
export function cleanPracticeDisplayName(name: string | null | undefined): string {
  let s = (name ?? "").trim();
  if (!s) return s;
  s = s.replace(GLUED_ENTITY_SUFFIX_RE, "$1");
  let prev = "";
  while (prev !== s) {
    prev = s;
    for (const re of TRAILING_ENTITY_SUFFIX_RES) {
      s = s.replace(re, "").trim();
    }
  }
  return s.replace(/\s{2,}/g, " ").trim();
}
