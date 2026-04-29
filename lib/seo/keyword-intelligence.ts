export type KeywordCluster =
  | 'student-success'
  | 'exam-prep'
  | 'academic-writing'
  | 'teaching-strategies'
  | 'parent-guides'
  | 'career-guidance'
  | 'edtech'
  | 'math-learning'
  | 'science-learning'
  | 'reading-skills';

export type KeywordRecommendation = 'approve_first' | 'review' | 'reject';

export type KeywordScoreResult = {
  cluster: KeywordCluster;
  pillar: string;
  quality_score: number;
  recommendation: KeywordRecommendation;
  search_intent: 'informational' | 'commercial' | 'navigational' | 'transactional';
  reasons: string[];
  risks: string[];
  score_breakdown: {
    intent: number;
    specificity: number;
    site_fit: number;
    article_potential: number;
    cluster_value: number;
    difficulty_fit: number;
  };
};

const CLUSTER_PILLARS: Record<KeywordCluster, string> = {
  'student-success': 'Study Skills and Student Success',
  'exam-prep': 'Exam Preparation',
  'academic-writing': 'Academic Writing',
  'teaching-strategies': 'Teaching Strategies',
  'parent-guides': 'Parent Education Guides',
  'career-guidance': 'Career Planning for Students',
  edtech: 'Education Technology',
  'math-learning': 'Math Learning',
  'science-learning': 'Science Learning',
  'reading-skills': 'Reading Skills'
};

const CLUSTER_PATTERNS: Array<[KeywordCluster, RegExp]> = [
  ['academic-writing', /essay|thesis|introduction|conclusion|paragraph|citation|argumentative|research paper|writing/i],
  ['exam-prep', /exam|test|finals|quiz|revision|prep|prepare|study schedule/i],
  ['reading-skills', /reading|comprehension|vocabulary|phonics|literacy/i],
  ['math-learning', /math|algebra|geometry|calculus|equation|fractions/i],
  ['science-learning', /science|biology|chemistry|physics|lab report/i],
  ['teaching-strategies', /teacher|classroom|lesson plan|teaching|students with|instruction/i],
  ['parent-guides', /parent|homework help|child|kids|at home/i],
  ['career-guidance', /career|college major|resume|internship|job|future career/i],
  ['edtech', /app|ai tool|online learning|digital|edtech|calculator|software/i],
  ['student-success', /study|learn|memory|focus|procrastination|notes|productivity|student/i]
];

const STRONG_INTENT_PATTERNS = [
  /^how to\b/i,
  /^what is\b/i,
  /^why\b/i,
  /^best\b/i,
  /^examples of\b/i,
  /^ways to\b/i,
  /^strategies for\b/i,
  /^checklist for\b/i,
  /^guide to\b/i,
  /\bvs\b/i,
  /\bfor beginners\b/i,
  /\bfor students\b/i
];

const WEAK_TERMS = [
  'education tips',
  'student success',
  'learning advice',
  'study better',
  'teaching tips',
  'school advice',
  'academic success',
  'education guide',
  'learning strategies',
  'study skills'
];

const OFF_TOPIC_PATTERNS = /casino|loan|crypto|dating|celebrity|sports betting|adult|weight loss|medical diagnosis/i;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeKeyword(keyword: string) {
  return keyword.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function inferKeywordCluster(keyword: string, fallback?: string | null): KeywordCluster {
  const normalizedFallback = String(fallback || '').trim() as KeywordCluster;
  if (normalizedFallback && normalizedFallback in CLUSTER_PILLARS) return normalizedFallback;

  for (const [cluster, pattern] of CLUSTER_PATTERNS) {
    if (pattern.test(keyword)) return cluster;
  }

  return 'student-success';
}

export function scoreKeywordIdea(input: {
  keyword: string;
  cluster?: string | null;
  audience?: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  content_type?: string | null;
}): KeywordScoreResult {
  const keyword = normalizeKeyword(input.keyword);
  const words = keyword.split(/\s+/).filter(Boolean);
  const cluster = inferKeywordCluster(
    [keyword, input.subject_area, input.content_type, input.audience].filter(Boolean).join(' '),
    input.cluster
  );

  const reasons: string[] = [];
  const risks: string[] = [];

  let intent = 45;
  if (STRONG_INTENT_PATTERNS.some((pattern) => pattern.test(keyword))) {
    intent += 35;
    reasons.push('Clear search intent');
  }
  if (/\bhow\b|\bwhy\b|\bwhat\b|\bbest\b|\bexamples\b|\bchecklist\b|\bvs\b/.test(keyword)) {
    intent += 10;
  }

  let specificity = 35;
  if (words.length >= 4) specificity += 20;
  if (words.length >= 6) specificity += 15;
  if (words.length > 10) {
    specificity -= 10;
    risks.push('May be too long or narrow');
  }
  if (/\b(student|students|college|high school|middle school|teacher|parent|exam|essay|study)\b/.test(keyword)) {
    specificity += 15;
    reasons.push('Specific audience or use case');
  }

  let siteFit = 45;
  if (/study|learn|student|teacher|parent|school|exam|essay|academic|reading|math|science|classroom|college|homework|memory|focus/.test(keyword)) {
    siteFit += 35;
    reasons.push('Strong Northfield topic fit');
  }
  if (OFF_TOPIC_PATTERNS.test(keyword)) {
    siteFit -= 60;
    risks.push('Off-topic for Northfield');
  }

  let articlePotential = 40;
  if (/how to|guide|examples|strategies|checklist|ways|vs|mistakes|step/.test(keyword)) {
    articlePotential += 30;
    reasons.push('Can support a full article structure');
  }
  if (/\bdefinition\b|\bmeaning\b/.test(keyword)) articlePotential += 10;
  if (words.length < 4) {
    articlePotential -= 25;
    risks.push('Too broad to rank easily');
  }

  let clusterValue = 55;
  if (['student-success', 'exam-prep', 'academic-writing'].includes(cluster)) {
    clusterValue += 20;
    reasons.push('Supports a core pillar cluster');
  }
  if (['math-learning', 'science-learning', 'reading-skills'].includes(cluster)) clusterValue += 10;

  let difficultyFit = 50;
  if (words.length >= 5 && words.length <= 9) {
    difficultyFit += 25;
    reasons.push('Long-tail keyword with better early ranking potential');
  }
  if (/^(study techniques|education|learning|student)$/i.test(keyword)) {
    difficultyFit -= 35;
    risks.push('Too competitive or generic');
  }

  if (WEAK_TERMS.includes(keyword)) {
    intent -= 25;
    specificity -= 25;
    difficultyFit -= 25;
    risks.push('Generic phrase with weak search intent');
  }

  const score_breakdown = {
    intent: clampScore(intent),
    specificity: clampScore(specificity),
    site_fit: clampScore(siteFit),
    article_potential: clampScore(articlePotential),
    cluster_value: clampScore(clusterValue),
    difficulty_fit: clampScore(difficultyFit)
  };

  const quality_score = clampScore(
    score_breakdown.intent * 0.2 +
      score_breakdown.specificity * 0.18 +
      score_breakdown.site_fit * 0.2 +
      score_breakdown.article_potential * 0.18 +
      score_breakdown.cluster_value * 0.12 +
      score_breakdown.difficulty_fit * 0.12
  );

  let recommendation: KeywordRecommendation = 'review';
  if (quality_score >= 84 && risks.length === 0) recommendation = 'approve_first';
  if (quality_score < 68 || siteFit < 40 || OFF_TOPIC_PATTERNS.test(keyword)) recommendation = 'reject';

  if (recommendation === 'approve_first') reasons.unshift('Recommended to approve first');
  if (recommendation === 'reject') risks.unshift('Not recommended for the current SEO strategy');

  return {
    cluster,
    pillar: CLUSTER_PILLARS[cluster],
    quality_score,
    recommendation,
    search_intent: 'informational',
    reasons: Array.from(new Set(reasons)).slice(0, 4),
    risks: Array.from(new Set(risks)).slice(0, 4),
    score_breakdown
  };
}

export function getRecommendationLabel(recommendation?: string | null) {
  if (recommendation === 'approve_first') return 'Approve first';
  if (recommendation === 'reject') return 'Reject';
  return 'Review';
}

export function getClusterLabel(cluster?: string | null) {
  if (!cluster) return 'Student Success';
  return cluster
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
