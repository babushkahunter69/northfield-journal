import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type ClaimedKeyword = {
  id: string;
  keyword: string;
  cluster: string | null;
  search_intent: string | null;
  audience: string | null;
  priority: number | null;
  country_code: string | null;
  status: string;
  priority_score: number | null;
};

type OutlineSection = {
  heading: string;
  subheadings?: string[];
};

type OutlineResponse = {
  workingTitle: string;
  slug: string;
  angle: string;
  seoTitle: string;
  seoDescription: string;
  targetWordCount: number;
  sections: OutlineSection[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
};

type DraftResponse = {
  title: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  contentMarkdown: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  readingTimeMinutes: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: requireEnv("OPENAI_API_KEY"),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function estimateReadingTime(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_\-\[\]\(\)!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 220));
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  const { data, error } = await supabase
    .from("posts")
    .select("slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) throw error;

  const existing = new Set((data ?? []).map((row) => row.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let i = 2;
  while (existing.has(`${baseSlug}-${i}`)) i += 1;
  return `${baseSlug}-${i}`;
}

async function logRun(params: {
  keywordId: string;
  briefId?: string | null;
  postId?: string | null;
  runType: string;
  status: "success" | "failed" | "started";
  modelName?: string;
  stage?: string;
  promptType?: string;
  inputSnapshot?: unknown;
  outputSnapshot?: unknown;
  errorMessage?: string | null;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCost?: number | null;
  workerId?: string | null;
}) {
  await supabase.from("content_generation_runs").insert({
    keyword_id: params.keywordId,
    brief_id: params.briefId ?? null,
    post_id: params.postId ?? null,
    run_type: params.runType,
    status: params.status,
    model_name: params.modelName ?? "gpt-5",
    input_snapshot: params.inputSnapshot ?? {},
    output_snapshot: params.outputSnapshot ?? {},
    error_message: params.errorMessage ?? null,
    stage: params.stage ?? null,
    prompt_type: params.promptType ?? null,
    duration_ms: params.durationMs ?? null,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    estimated_cost: params.estimatedCost ?? null,
    worker_id: params.workerId ?? null,
  });
}

function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {}

  const match = trimmed.match(/\{[\s\S]*\}$/);
  if (!match) throw new Error("Model did not return valid JSON");
  return JSON.parse(match[0]) as T;
}

function buildOutlinePrompt(keyword: ClaimedKeyword) {
  return `
You are creating a content brief for an education website aimed at a Western audience.

Keyword: ${keyword.keyword}
Cluster: ${keyword.cluster ?? "general education"}
Search intent: ${keyword.search_intent ?? "informational"}
Audience: ${keyword.audience ?? "students"}
Country: ${keyword.country_code ?? "US"}

Return valid JSON only with this exact shape:
{
  "workingTitle": "string",
  "slug": "string",
  "angle": "string",
  "seoTitle": "string",
  "seoDescription": "string",
  "targetWordCount": 1400,
  "sections": [
    {
      "heading": "string",
      "subheadings": ["string"]
    }
  ],
  "faq": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}
`;
}

function buildDraftPrompt(keyword: ClaimedKeyword, brief: OutlineResponse) {
  return `
You are writing a draft article for an education website aimed at a Western audience.

Keyword: ${keyword.keyword}
Cluster: ${keyword.cluster ?? "general education"}
Search intent: ${keyword.search_intent ?? "informational"}
Audience: ${keyword.audience ?? "students"}
Country: ${keyword.country_code ?? "US"}

Brief JSON:
${JSON.stringify(brief, null, 2)}

Write a full draft in Markdown.

Editorial requirements:
- Start with a strong introduction that answers the search intent quickly.
- Use the section headings from the brief.
- Include concrete examples where useful.
- Keep the tone clear, practical, natural, and teacher-like.
- Avoid keyword stuffing.
- Avoid fake statistics, fake citations, or fabricated claims.
- Include a FAQ section near the end.
- End with a concise conclusion.

Formatting rules:
- Use Markdown tables when comparing examples such as weak vs strong, good vs bad, before vs after.
- Always format comparisons into a 2-column table.
- Do NOT present comparisons as plain paragraphs.
- If the content includes comparisons, you MUST use a table.
- Use bullet points for lists.
- Use short paragraphs (2–3 lines max).
- Make the article highly scannable.

Return valid JSON only with this exact shape:
{
  "title": "string",
  "excerpt": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "contentMarkdown": "string",
  "faq": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "readingTimeMinutes": 7
}
`;
}

export async function GET(req: Request) {
  const workerId = `worker-${crypto.randomUUID()}`;
  let claimedKeyword: ClaimedKeyword | null = null;
  let briefId: string | null = null;
  let postId: string | null = null;

  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: claimedRows, error: claimError } = await supabase.rpc(
      "claim_next_keyword",
      { p_worker_id: workerId }
    );

    if (claimError) throw claimError;

    claimedKeyword = claimedRows?.[0] as ClaimedKeyword | undefined ?? null;

    if (!claimedKeyword) {
      return NextResponse.json({ message: "No queued keywords" });
    }

    await logRun({
      keywordId: claimedKeyword.id,
      runType: "full_pipeline",
      status: "started",
      stage: "claim",
      workerId,
      inputSnapshot: { claimedKeyword },
    });

    const outlineStartedAt = Date.now();
    const outlineResponse = await openai.responses.create({
      model: "gpt-5",
      input: buildOutlinePrompt(claimedKeyword),
    });

    const outline = extractJson<OutlineResponse>(outlineResponse.output_text);
    const outlineDuration = Date.now() - outlineStartedAt;

    const uniqueSlug = await ensureUniqueSlug(
      slugify(outline.slug || outline.workingTitle || claimedKeyword.keyword)
    );

    const { data: brief, error: briefError } = await supabase
      .from("content_briefs")
      .insert({
        keyword_id: claimedKeyword.id,
        working_title: outline.workingTitle,
        slug: uniqueSlug,
        angle: outline.angle,
        outline_json: outline.sections,
        seo_title: outline.seoTitle,
        seo_description: outline.seoDescription,
        target_word_count: outline.targetWordCount || 1400,
        status: "draft",
        brief_status: "in_progress",
        primary_keyword: claimedKeyword.keyword,
        secondary_keywords_json: claimedKeyword.cluster ? [claimedKeyword.cluster] : [],
      })
      .select("id")
      .single();

    if (briefError || !brief) throw briefError || new Error("Failed to create brief");
    briefId = brief.id;

    await logRun({
      keywordId: claimedKeyword.id,
      briefId,
      runType: "full_pipeline",
      status: "success",
      stage: "brief",
      modelName: "gpt-5",
      promptType: claimedKeyword.search_intent ?? "informational",
      durationMs: outlineDuration,
      inputTokens: outlineResponse.usage?.input_tokens ?? null,
      outputTokens: outlineResponse.usage?.output_tokens ?? null,
      workerId,
      inputSnapshot: { keyword: claimedKeyword },
      outputSnapshot: outline,
    });

    const draftStartedAt = Date.now();
    const draftResponse = await openai.responses.create({
      model: "gpt-5",
      input: buildDraftPrompt(claimedKeyword, { ...outline, slug: uniqueSlug }),
    });

    const draft = extractJson<DraftResponse>(draftResponse.output_text);
    const draftDuration = Date.now() - draftStartedAt;

    const readingTime =
      draft.readingTimeMinutes && Number.isFinite(draft.readingTimeMinutes)
        ? Math.max(1, draft.readingTimeMinutes)
        : estimateReadingTime(draft.contentMarkdown);

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: draft.title,
        slug: uniqueSlug,
        excerpt: draft.excerpt,
        content: draft.contentMarkdown,
        author_name: "Editorial Team",
        author_bio: "Northfield Journal editors",
        meta_title: draft.metaTitle,
        meta_description: draft.metaDescription,
        keywords: [claimedKeyword.keyword],
        source_type: "ai_generated",
        generation_status: "draft",
        faq_json: draft.faq,
        status: "draft",
        reading_time_minutes: readingTime,
        source_keyword_id: claimedKeyword.id,
        source_brief_id: briefId,
      })
      .select("id")
      .single();

    if (postError || !post) throw postError || new Error("Failed to create post");
    postId = post.id;

    const { error: briefUpdateError } = await supabase
      .from("content_briefs")
      .update({
        post_id: postId,
        brief_status: "completed",
      })
      .eq("id", briefId);

    if (briefUpdateError) throw briefUpdateError;

    await logRun({
      keywordId: claimedKeyword.id,
      briefId,
      postId,
      runType: "full_pipeline",
      status: "success",
      stage: "draft_generation",
      modelName: "gpt-5",
      promptType: claimedKeyword.search_intent ?? "informational",
      durationMs: draftDuration,
      inputTokens: draftResponse.usage?.input_tokens ?? null,
      outputTokens: draftResponse.usage?.output_tokens ?? null,
      workerId,
      inputSnapshot: { briefId, keyword: claimedKeyword },
      outputSnapshot: { title: draft.title, slug: uniqueSlug },
    });

    const { error: completeError } = await supabase.rpc("mark_keyword_completed", {
      p_keyword_id: claimedKeyword.id,
      p_completed_status: "done",
    });

    if (completeError) throw completeError;

    return NextResponse.json({
      success: true,
      keyword: claimedKeyword.keyword,
      briefId,
      postId,
      slug: uniqueSlug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (claimedKeyword?.id) {
      await supabase.rpc("mark_keyword_failed", {
        p_keyword_id: claimedKeyword.id,
      });

      await logRun({
        keywordId: claimedKeyword.id,
        briefId,
        postId,
        runType: "full_pipeline",
        status: "failed",
        stage: "pipeline",
        errorMessage: message,
        workerId,
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}