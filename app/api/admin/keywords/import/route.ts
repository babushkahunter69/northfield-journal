import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { scoreKeywordIdea } from '@/lib/seo/keyword-intelligence';

type Defaults = {
  audience?: string;
  grade_band?: string;
  subject_area?: string;
  content_type?: string;
  cluster?: string;
  priority?: number;
  target_country?: string;
  curriculum?: string;
  tone?: string;
};

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function parseCSVLine(line: string) {
  const parts = line.split(',').map((part) => part.trim());

  return {
    keyword: parts[0] || '',
    audience: parts[1] || '',
    grade_band: parts[2] || '',
    subject_area: parts[3] || '',
    content_type: parts[4] || '',
    priority: parts[5] ? Number(parts[5]) : undefined,
    cluster: parts[6] || ''
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = normalizeText(body?.raw);
    const defaults = (body?.defaults || {}) as Defaults;

    if (!raw) {
      return NextResponse.json({ error: 'No keyword input provided.' }, { status: 400 });
    }

    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'No valid rows found.' }, { status: 400 });
    }

    const seen = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];
    let skipped = 0;

    for (const line of lines) {
      const parsed = parseCSVLine(line);
      const keyword = normalizeText(parsed.keyword);

      if (!keyword) {
        skipped += 1;
        continue;
      }

      const dedupeKey = keyword.toLowerCase();
      if (seen.has(dedupeKey)) {
        skipped += 1;
        continue;
      }
      seen.add(dedupeKey);

      const audience = normalizeText(parsed.audience || defaults.audience) || 'students';
      const gradeBand = normalizeText(parsed.grade_band || defaults.grade_band) || 'high-school';
      const subjectArea = normalizeText(parsed.subject_area || defaults.subject_area) || 'study-skills';
      const contentType = normalizeText(parsed.content_type || defaults.content_type) || 'study-guide';
      const cluster = normalizeText(parsed.cluster || defaults.cluster);

      const intelligence = scoreKeywordIdea({
        keyword,
        audience,
        grade_band: gradeBand,
        subject_area: subjectArea,
        content_type: contentType,
        cluster
      });

      const externalPriority =
        typeof parsed.priority === 'number' && Number.isFinite(parsed.priority)
          ? parsed.priority
          : Number(defaults.priority ?? intelligence.quality_score);

      rows.push({
        keyword,
        status: 'candidate',
        priority: Math.max(intelligence.quality_score, Math.round(externalPriority)),
        quality_score: intelligence.quality_score,
        approval_recommendation: intelligence.recommendation,
        scoring_notes: { reasons: intelligence.reasons, risks: intelligence.risks },
        score_breakdown: intelligence.score_breakdown,
        pillar: intelligence.pillar,
        audience,
        grade_band: gradeBand,
        subject_area: subjectArea,
        content_type: contentType,
        cluster: intelligence.cluster,
        target_country: normalizeText(defaults.target_country) || 'US',
        curriculum: normalizeText(defaults.curriculum) || 'general',
        tone: normalizeText(defaults.tone) || 'supportive',
        learning_objective: null
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'All rows were empty or duplicates.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('content_keywords').insert(rows);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      inserted: rows.length,
      skipped
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed.' },
      { status: 500 }
    );
  }
}
