import type { GeneratedKeywordIdea } from './generate-keywords';

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','before','better','busy','can','for','from','guide','help','how','in','into','is','of','on','or','students','student','teachers','teacher','parents','parent','the','their','them','to','use','using','way','ways','what','when','who','with','without','your'
]);

const SYNONYMS: Array<[RegExp, string]> = [
  [/final exam preparation|final exam prep|exam preparation|exam prep|test preparation|test prep/g, 'exam prep'],
  [/classroom teaching|teaching strategies|instructional strategies/g, 'teaching'],
  [/time management|student time management/g, 'time management'],
  [/active recall study methods|active recall methods/g, 'active recall'],
  [/high school|middle school|elementary school/g, 'school'],
  [/struggling learners|struggling students/g, 'struggling students'],
  [/feel overwhelmed|overwhelmed/g, 'overwhelmed']
];

function stem(token: string) {
  return token
    .replace(/ies$/, 'y')
    .replace(/ing$/, '')
    .replace(/tion$/, '')
    .replace(/ment$/, '')
    .replace(/s$/, '');
}

export function normalizeKeyword(value: string) {
  let text = value.toLowerCase().trim();
  for (const [pattern, replacement] of SYNONYMS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function keywordTokens(value: string) {
  return normalizeKeyword(value)
    .split(/\s+/)
    .map(stem)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function keywordIntentKey(value: string) {
  const tokens = Array.from(new Set(keywordTokens(value))).sort();
  return tokens.slice(0, 6).join('|');
}

export function isNearDuplicateKeyword(a: string, b: string) {
  const aTokens = Array.from(new Set(keywordTokens(a)));
  const bTokens = Array.from(new Set(keywordTokens(b)));

  if (aTokens.length === 0 || bTokens.length === 0) return false;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const intersection = aTokens.filter((token) => bSet.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(aTokens.length, bTokens.length);

  if (keywordIntentKey(a) === keywordIntentKey(b)) return true;
  if (jaccard >= 0.52) return true;
  if (containment >= 0.72 && intersection >= 3) return true;

  const normalizedA = normalizeKeyword(a);
  const normalizedB = normalizeKeyword(b);
  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

export function diversifyKeywordIdeas(
  ideas: GeneratedKeywordIdea[],
  options: {
    max: number;
    existingKeywords?: string[];
    maxPerCluster?: number;
  }
) {
  const max = Math.max(1, options.max);
  const maxPerCluster = Math.max(1, options.maxPerCluster ?? 4);
  const accepted: GeneratedKeywordIdea[] = [];
  const existing = (options.existingKeywords || []).filter(Boolean);
  const clusterCounts = new Map<string, number>();
  const exact = new Set<string>();

  for (const item of ideas) {
    const normalized = normalizeKeyword(item.keyword);
    if (!normalized || exact.has(normalized)) continue;
    exact.add(normalized);

    if (existing.some((keyword) => isNearDuplicateKeyword(keyword, item.keyword))) continue;
    if (accepted.some((keyword) => isNearDuplicateKeyword(keyword.keyword, item.keyword))) continue;

    const cluster = item.cluster || 'general';
    const count = clusterCounts.get(cluster) || 0;
    if (count >= maxPerCluster) continue;

    accepted.push(item);
    clusterCounts.set(cluster, count + 1);
    if (accepted.length >= max) break;
  }

  return accepted;
}
