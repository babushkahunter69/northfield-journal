type EducationMetadata = {
  audience?: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  content_type?: string | null;
  target_country?: string | null;
  curriculum?: string | null;
  learning_objective?: string | null;
  tone?: string | null;
};

function fallback(value: string | null | undefined, defaultValue: string) {
  const trimmed = String(value || '').trim();
  return trimmed || defaultValue;
}

export function buildEducationContext(keyword: EducationMetadata & { keyword: string }) {
  return {
    audience: fallback(keyword.audience, 'general'),
    gradeBand: fallback(keyword.grade_band, 'general'),
    subjectArea: fallback(keyword.subject_area, 'general education'),
    contentType: fallback(keyword.content_type, 'concept-explainer'),
    targetCountry: fallback(keyword.target_country, 'general'),
    curriculum: fallback(keyword.curriculum, 'general'),
    learningObjective: fallback(
      keyword.learning_objective,
      `Help readers understand and apply ${keyword.keyword}.`
    ),
    tone: fallback(keyword.tone, 'supportive, clear, practical')
  };
}

export function educationContextBlock(
  keyword: EducationMetadata & { keyword: string }
): string {
  const ctx = buildEducationContext(keyword);

  return [
    `Keyword: ${keyword.keyword}`,
    `Audience: ${ctx.audience}`,
    `Grade band: ${ctx.gradeBand}`,
    `Subject area: ${ctx.subjectArea}`,
    `Content type: ${ctx.contentType}`,
    `Target country: ${ctx.targetCountry}`,
    `Curriculum: ${ctx.curriculum}`,
    `Learning objective: ${ctx.learningObjective}`,
    `Tone: ${ctx.tone}`
  ].join('\n');
}