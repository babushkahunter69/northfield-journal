import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

function inferCluster(input: {
  subject_area?: string;
  content_type?: string;
  audience?: string;
  cluster?: string;
}) {
  const explicit = normalizeText(input.cluster);
  if (explicit) return explicit;

  const subject = normalizeText(input.subject_area).toLowerCase();
  const type = normalizeText(input.content_type).toLowerCase();
  const audience = normalizeText(input.audience).toLowerCase();

  if (type.includes('parent') || audience === 'parents') return 'parent-guides';
  if (type.includes('teaching') || audience === 'teachers') return 'teaching-strategies';
  if (type.includes('exam')) return 'exam-prep';
  if (type.includes('career')) return 'career-guidance';
  if (type.includes('edtech')) return 'edtech';
  if (subject.includes('writing')) return 'academic-writing';
  if (subject.includes('math')) return 'math-learning';
  if (subject.includes('science')) return 'science-learning';
  if (subject.includes('reading')) return 'reading-skills';
  if (subject.includes('study')) return 'student-success';

  return 'student-success';
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
      const gradeBand =
        normalizeText(parsed.grade_band || defaults.grade_band) || 'high-school';
      const subjectArea =
        normalizeText(parsed.subject_area || defaults.subject_area) || 'study-skills';
      const contentType =
        normalizeText(parsed.content_type || defaults.content_type) || 'study-guide';
      const cluster = inferCluster({
        cluster: parsed.cluster || defaults.cluster,
        audience,
        subject_area: subjectArea,
        content_type: contentType
      });

      rows.push({
        keyword,
        status: 'queued',
        priority:
          typeof parsed.priority === 'number' && Number.isFinite(parsed.priority)
            ? parsed.priority
            : Number(defaults.priority ?? 80),
        audience,
        grade_band: gradeBand,
        subject_area: subjectArea,
        content_type: contentType,
        cluster,
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

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      inserted: rows.length,
      skipped
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Import failed.'
      },
      { status: 500 }
    );
  }
}