import OpenAI from 'openai'
import type { GeneratedArticle, GeneratedBrief } from '@/lib/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

type EducationBrief = GeneratedBrief & {
  audience?: string | null
  grade_band?: string | null
  subject_area?: string | null
}

function buildPrompt(brief: EducationBrief) {
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
    { "question": "", "answer": "" },
    { "question": "", "answer": "" },
    { "question": "", "answer": "" },
    { "question": "", "answer": "" },
    { "question": "", "answer": "" }
  ],
  "keywords": []
}

Topic: ${brief.working_title}
Audience: ${brief.audience || 'students and educators'}
Grade level: ${brief.grade_band || 'mixed'}
Subject area: ${brief.subject_area || 'general education'}

Requirements:
- Write 1,300 to 1,800 words.
- HTML only inside "content".
- No markdown.
- Include these exact sections in content:

<h2>Quick Answer</h2>
<h2>Key Takeaways</h2>
<h2>Why This Matters</h2>
<h2>Step-by-Step Explanation</h2>
<h2>Real Examples</h2>
<h2>Common Mistakes</h2>
<h2>What You Should Do Next</h2>
<h2>FAQ</h2>
<h2>Sources</h2>

FAQ rules:
- The "faq" JSON array must contain exactly 5 FAQ items.
- The content must also include an FAQ section with the same questions and answers.

Sources:
- Include at least 2 credible education/research sources.
- Use real links.

Style:
- Practical
- Clear
- Helpful for real students, teachers, or parents
- No generic filler
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

function wordCount(html: string) {
  return html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
}

async function callModel(prompt: string) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 5000
  })

  return res.choices[0].message.content || ''
}

export async function generateArticle(
  brief: EducationBrief
): Promise<GeneratedArticle> {
  let text = await callModel(buildPrompt(brief))
  let parsed: GeneratedArticle = safeParse(text)

  const needsRetry =
    wordCount(parsed.content || '') < 1200 ||
    !Array.isArray(parsed.faq) ||
    parsed.faq.length < 5

  if (needsRetry) {
    text = await callModel(`
The previous article was too short or missing FAQ items.

Rewrite it again.

Mandatory:
- 1,300 to 1,800 words
- exactly 5 FAQ items in the JSON faq array
- FAQ section inside content
- Sources section inside content
- HTML only inside content
- Return ONLY valid JSON

Original brief:
${buildPrompt(brief)}
`)
    parsed = safeParse(text)
  }

  return {
    ...parsed,
    faq: Array.isArray(parsed.faq) ? parsed.faq.slice(0, 5) : [],
    keywords: parsed.keywords || []
  }
}