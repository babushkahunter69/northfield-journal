import OpenAI from 'openai'
import type { GeneratedArticle, GeneratedBrief } from '@/lib/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function buildPrompt(brief: GeneratedBrief) {
  return `
You are an expert education content writer for Northfield Journal.

Return ONLY valid JSON:
{
  "title": "",
  "slug": "",
  "excerpt": "",
  "meta_title": "",
  "meta_description": "",
  "content": "",
  "faq": [
    { "question": "", "answer": "" }
  ]
}

TOPIC:
${brief.working_title}

KEYWORD:
${brief.slug}

AUDIENCE:
${brief.audience || 'students'}

GRADE LEVEL:
${brief.grade_band || 'mixed'}

SUBJECT:
${brief.subject_area || 'general education'}

---

GOAL:
Write a clear, practical, SEO-optimized education article that helps students, teachers, or learners solve a real problem.

---

STRICT STRUCTURE (MANDATORY):

Intro (answer-first, 2–3 paragraphs)

<h2>Quick Answer</h2>

<h2>Key Takeaways</h2>
<ul>
<li>...</li>
<li>...</li>
<li>...</li>
</ul>

<h2>What This Means for ${brief.audience || 'Students'}</h2>

<h2>Step-by-Step Explanation</h2>

<h2>Real Examples</h2>

<h2>Common Mistakes</h2>

<h2>What You Should Do Next</h2>

<h2>FAQ</h2>

<h2>Sources</h2>

---

CONTENT RULES:

- HTML only (no markdown)
- Use <p>, <h2>, <h3>, <ul>, <li>
- No fluff
- No generic phrases
- No hype language

---

EDUCATION REQUIREMENTS:

- Include student or classroom examples
- Use simple explanations
- Avoid jargon unless explained
- Make it usable for real learning situations

---

SEO:

- Title must be compelling
- Meta description must be clear and useful
- Include keyword naturally

---

SOURCES:

- Include at least 2 real educational or research sources
- Format:
<a href="URL" target="_blank">Source Name</a>

---

FAQ:

- 4–6 questions
- Short, clear answers

---

FINAL RULE:

This article should:
- Help a real student or teacher
- Be easy to understand
- Be structured for Google + AI extraction
`
}

function safeParse(text: string): GeneratedArticle {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain valid JSON.')
  }

  return JSON.parse(text.slice(start, end + 1)) as GeneratedArticle
}

export async function generateArticle(
  brief: GeneratedBrief
): Promise<GeneratedArticle> {
  const prompt = buildPrompt(brief)

  const res = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  })

  const text = res.choices[0].message.content || ''

  const parsed: GeneratedArticle = safeParse(text)

return {
  ...parsed,
  faq: parsed.faq || [],
  keywords: parsed.keywords || []
}
}