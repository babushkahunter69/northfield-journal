import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  return process.env[name] || "";
}

const SUPABASE_URL = getEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

type ClaimedKeyword = {
  id: string;
  keyword: string;
  cluster: string | null;
  search_intent: string | null;
  audience: string | null;
  country_code: string | null;
  status?: string | null;
  priority?: number | null;
  priority_score?: number | null;
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

async function callOpenAI(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error("OpenAI error:", json);
    throw new Error(json?.error?.message || "OpenAI request failed");
  }

  return json.choices?.[0]?.message?.content || "";
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildDraftPrompt(keyword: ClaimedKeyword, brief: unknown) {
  return `
You are writing a draft article for an education website aimed at a Western audience.

Keyword: ${keyword.keyword}
Cluster: ${keyword.cluster ?? "general education"}
Search intent: ${keyword.search_intent ?? "informational"}
Audience: ${keyword.audience ?? "students"}
Country: ${keyword.country_code ?? "US"}

Brief JSON:
${JSON.stringify(brief ?? {}, null, 2)}

Write a full article.

Editorial requirements:
- Start with a strong introduction that answers the search intent quickly.
- Use the section headings from the brief if they exist.
- Include concrete examples where useful.
- Keep the tone clear, practical, natural, and teacher-like.
- Avoid keyword stuffing.
- Avoid fake statistics or fabricated claims.
- Include a FAQ section near the end.
- End with a concise conclusion.

Formatting rules:
- Write in clean article prose, not raw Markdown headings.
- Do NOT use # or ## headings in the content.
- Use short paragraphs.
- Use bullet points when helpful.
- ONLY use Markdown tables for comparisons such as weak vs strong, good vs bad, before vs after.
- If a comparison section exists, it MUST be a 2-column Markdown table.
- Do NOT use Markdown tables outside comparison sections.

Return JSON ONLY:
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

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not initialized" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.rpc("claim_next_keyword", {
      p_worker_id: "cron-worker",
    });

    if (error) {
      console.error("Claim error:", error);
      throw error;
    }

    const claimedRows = (data ?? []) as ClaimedKeyword[];
    const keyword = claimedRows[0] ?? null;

    if (!keyword) {
      return NextResponse.json({
        message: "No queued keywords",
      });
    }

    const { data: brief } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("keyword_id", keyword.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prompt = buildDraftPrompt(keyword, brief);
    const aiRaw = await callOpenAI(prompt);

    let ai: DraftResponse;
    try {
      ai = JSON.parse(aiRaw);
    } catch {
      console.error("JSON parse failed:", aiRaw);
      throw new Error("Invalid AI JSON");
    }

    const DEFAULT_CATEGORY_ID = "86bc09cb-dbcc-40d9-81ec-ec7327ac0762";

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: ai.title,
        slug: slugify(ai.title),
        content: ai.contentMarkdown,
        excerpt: ai.excerpt,
        meta_title: ai.metaTitle,
        meta_description: ai.metaDescription,
        status: "draft",
        author_name: "Northfield Journal",
        category_id: DEFAULT_CATEGORY_ID,
      })
      .select("id, slug")
      .single();

    if (postError) {
      throw postError;
    }

    await supabase.from("content_generation_runs").insert({
      keyword_id: keyword.id,
      brief_id: brief?.id ?? null,
      post_id: post.id,
      status: "completed",
      run_type: "full_pipeline",
    });

    await supabase
      .from("content_keywords")
      .update({
        status: "done",
        locked_by: null,
      })
      .eq("id", keyword.id);

    return NextResponse.json({
      success: true,
      keyword: keyword.keyword,
      postId: post.id,
      slug: post.slug,
    });
  } catch (err: any) {
    console.error("CRON ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}