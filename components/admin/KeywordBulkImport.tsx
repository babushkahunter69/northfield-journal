'use client';

import { useMemo, useState } from 'react';

type ImportDefaults = {
  audience: string;
  grade_band: string;
  subject_area: string;
  content_type: string;
  cluster: string;
  priority: number;
  target_country: string;
  curriculum: string;
  tone: string;
};

type ImportResponse = {
  success?: boolean;
  inserted?: number;
  skipped?: number;
  error?: string;
};

const DEFAULTS: ImportDefaults = {
  audience: 'students',
  grade_band: 'high-school',
  subject_area: 'study-skills',
  content_type: 'study-guide',
  cluster: 'student-success',
  priority: 80,
  target_country: 'US',
  curriculum: 'general',
  tone: 'supportive'
};

const SAMPLE_TEXT = `best study habits for high school students,students,high-school,study-skills,study-guide,100,student-success
how to revise effectively for exams,students,high-school,study-skills,exam-prep,95,exam-prep
how to stop procrastinating on homework,students,high-school,study-skills,study-guide,90,student-success`;

function parsePreviewLines(raw: string) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      return {
        keyword: parts[0] || '',
        audience: parts[1] || DEFAULTS.audience,
        grade_band: parts[2] || DEFAULTS.grade_band,
        subject_area: parts[3] || DEFAULTS.subject_area,
        content_type: parts[4] || DEFAULTS.content_type,
        priority: Number(parts[5]) || DEFAULTS.priority,
        cluster: parts[6] || DEFAULTS.cluster
      };
    });
}

export default function KeywordBulkImport() {
  const [raw, setRaw] = useState('');
  const [defaults, setDefaults] = useState<ImportDefaults>(DEFAULTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [fileName, setFileName] = useState('');

  const previewRows = useMemo(() => parsePreviewLines(raw), [raw]);

  async function handleImport() {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/keywords/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw,
          defaults
        })
      });

      const data = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Import failed.');
      }

      setResult(data);
      setRaw('');
      setFileName('');
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Import failed.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setRaw(text);
    };
    reader.readAsText(file);
  }

  function updateDefault<K extends keyof ImportDefaults>(
    key: K,
    value: ImportDefaults[K]
  ) {
    setDefaults((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Bulk Import
        </p>
        <h3 className="text-3xl font-semibold tracking-tight text-slate-900">
          Add keywords in bulk
        </h3>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Paste one keyword per line or use CSV rows in this format:
          <span className="mx-1 font-medium text-slate-800">
            keyword, audience, grade_band, subject_area, content_type, priority, cluster
          </span>
          Missing columns will use your default values below.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">
                  Paste keywords or CSV
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  One row per line. CSV upload also works.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
                Upload CSV
                <input
                  type="file"
                  accept=".csv,text/csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {fileName ? (
              <p className="mb-3 text-sm text-slate-500">Loaded file: {fileName}</p>
            ) : null}

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={12}
              placeholder={SAMPLE_TEXT}
              className="min-h-[260px] w-full rounded-[20px] border border-stone-300 bg-white px-4 py-4 font-mono text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-500"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Rows detected:{' '}
                <span className="font-semibold text-slate-800">
                  {
                    raw
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean).length
                  }
                </span>
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setRaw(SAMPLE_TEXT)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Load sample
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRaw('');
                    setFileName('');
                    setResult(null);
                  }}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isSubmitting || !raw.trim()}
                  className="rounded-full bg-[#0f2350] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#112a61] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Importing...' : 'Import keywords'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <h4 className="text-lg font-semibold text-slate-900">Preview</h4>
            <p className="mt-1 text-sm text-slate-500">
              First few rows from your current input.
            </p>

            <div className="mt-4 overflow-hidden rounded-[18px] border border-stone-200 bg-white">
              <div className="grid grid-cols-7 gap-3 border-b border-stone-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="col-span-2">Keyword</span>
                <span>Audience</span>
                <span>Grade</span>
                <span>Subject</span>
                <span>Priority</span>
                <span>Cluster</span>
              </div>

              {previewRows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Paste some rows to preview them here.
                </div>
              ) : (
                previewRows.map((row, index) => (
                  <div
                    key={`${row.keyword}-${index}`}
                    className="grid grid-cols-7 gap-3 border-b border-stone-100 px-4 py-3 text-sm text-slate-700 last:border-b-0"
                  >
                    <span className="col-span-2 line-clamp-2 font-medium text-slate-900">
                      {row.keyword}
                    </span>
                    <span>{row.audience}</span>
                    <span>{row.grade_band}</span>
                    <span>{row.subject_area}</span>
                    <span>{row.priority}</span>
                    <span>{row.cluster}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <h4 className="text-lg font-semibold text-slate-900">Default metadata</h4>
            <p className="mt-1 text-sm text-slate-500">
              Used when a row only contains a keyword or leaves some columns blank.
            </p>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Audience</span>
                <select
                  value={defaults.audience}
                  onChange={(e) => updateDefault('audience', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  <option value="students">students</option>
                  <option value="teachers">teachers</option>
                  <option value="parents">parents</option>
                  <option value="general">general</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Grade band</span>
                <select
                  value={defaults.grade_band}
                  onChange={(e) => updateDefault('grade_band', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  <option value="elementary">elementary</option>
                  <option value="middle-school">middle-school</option>
                  <option value="high-school">high-school</option>
                  <option value="college">college</option>
                  <option value="adult">adult</option>
                  <option value="general">general</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Subject area</span>
                <input
                  value={defaults.subject_area}
                  onChange={(e) => updateDefault('subject_area', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                  placeholder="study-skills"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Content type</span>
                <select
                  value={defaults.content_type}
                  onChange={(e) => updateDefault('content_type', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  <option value="study-guide">study-guide</option>
                  <option value="exam-prep">exam-prep</option>
                  <option value="lesson-summary">lesson-summary</option>
                  <option value="teaching-strategy">teaching-strategy</option>
                  <option value="parent-guide">parent-guide</option>
                  <option value="career-guidance">career-guidance</option>
                  <option value="edtech">edtech</option>
                  <option value="concept-explainer">concept-explainer</option>
                  <option value="resource-roundup">resource-roundup</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Cluster</span>
                <select
                  value={defaults.cluster}
                  onChange={(e) => updateDefault('cluster', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                >
                  <option value="student-success">student-success</option>
                  <option value="exam-prep">exam-prep</option>
                  <option value="academic-writing">academic-writing</option>
                  <option value="teaching-strategies">teaching-strategies</option>
                  <option value="parent-guides">parent-guides</option>
                  <option value="career-guidance">career-guidance</option>
                  <option value="edtech">edtech</option>
                  <option value="math-learning">math-learning</option>
                  <option value="science-learning">science-learning</option>
                  <option value="reading-skills">reading-skills</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Priority</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={defaults.priority}
                  onChange={(e) =>
                    updateDefault(
                      'priority',
                      Number.isFinite(Number(e.target.value))
                        ? Number(e.target.value)
                        : DEFAULTS.priority
                    )
                  }
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Target country</span>
                <input
                  value={defaults.target_country}
                  onChange={(e) => updateDefault('target_country', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                  placeholder="US"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Curriculum</span>
                <input
                  value={defaults.curriculum}
                  onChange={(e) => updateDefault('curriculum', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                  placeholder="general"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Tone</span>
                <input
                  value={defaults.tone}
                  onChange={(e) => updateDefault('tone', e.target.value)}
                  className="rounded-[16px] border border-stone-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500"
                  placeholder="supportive"
                />
              </label>
            </div>
          </div>

          {result ? (
            <div
              className={`rounded-[24px] border p-4 ${
                result.error
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <h4
                className={`text-base font-semibold ${
                  result.error ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {result.error ? 'Import failed' : 'Import complete'}
              </h4>

              {result.error ? (
                <p className="mt-2 text-sm text-rose-700">{result.error}</p>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-emerald-700">
                  <p>Inserted: {result.inserted ?? 0}</p>
                  <p>Skipped: {result.skipped ?? 0}</p>
                </div>
              )}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <h4 className="text-lg font-semibold text-slate-900">Accepted formats</h4>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <div>
                <p className="font-medium text-slate-800">Simple</p>
                <code className="mt-1 block rounded-[14px] bg-white px-3 py-2 text-xs text-slate-700">
                  how to revise effectively for exams
                </code>
              </div>

              <div>
                <p className="font-medium text-slate-800">CSV row</p>
                <code className="mt-1 block rounded-[14px] bg-white px-3 py-2 text-xs text-slate-700">
                  best study habits for high school students,students,high-school,study-skills,study-guide,100,student-success
                </code>
              </div>

              <p>
                Columns map to:
                <span className="ml-1 font-medium text-slate-800">
                  keyword, audience, grade_band, subject_area, content_type, priority, cluster
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}