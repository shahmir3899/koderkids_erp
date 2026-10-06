// Rule-based short school names, used e.g. for report ZIP filenames.
//   "The Smart School, Soan Garden"  -> "Smart Soan Garden"
//   "Mazen Schools Quaid Campus"     -> "Mazen Quaid"
//   "Home Tuition (Mr. Babar)"       -> "Home Tuition Babar"
// Drops generic filler words, keeps the distinctive ones, caps the length, and
// falls back to the full name if nothing would be left.

const FILLER_WORDS = new Set([
  'the', 'school', 'schools', 'campus', 'branch', 'system', 'and', 'of',
  'mr', 'mrs', 'ms', 'dr',
]);

const MAX_WORDS = 3;
const MAX_CHARS = 24;

export const shortSchoolName = (name) => {
  const original = String(name || '').trim();
  if (!original) return '';

  const words = original
    .replace(/[^A-Za-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const kept = words.filter((w) => !FILLER_WORDS.has(w.toLowerCase()));
  const chosen = (kept.length ? kept : words).slice(0, MAX_WORDS);

  let short = chosen.join(' ');
  if (short.length > MAX_CHARS) short = short.slice(0, MAX_CHARS).replace(/\s+\S*$/, '') || short.slice(0, MAX_CHARS);
  return short;
};

export default shortSchoolName;
