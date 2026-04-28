import OpenAI from 'openai'
import type { GeneratedArticle, GeneratedBrief } from '@/lib/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type EducationBrief = GeneratedBrief & {
  audience?: string | null
  grade_band?: string | null
  subject_area?: string | null
}

function wordCount(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function safeParse(text: string): GeneratedArticle {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain valid JSON.')
  }

  return JSON.parse(text.slice(start, end + 1)) as GeneratedArticle
}

function buildPrompt(brief: EducationBrief) {
  return `
You are an expert education writer for Northfield Journal.

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

MANDATORY:
- Write at least 1,500 words.
- HTML only inside "content".
- No markdown.
- The faq JSON array must contain exactly 5 items.
- The content must also include an FAQ section.
- Include at least 2 source links.

Required content sections:
<h2>Quick Answer</h2>
<h2>Key Takeaways</h2>
<h2>Why This Matters</h2>
<h2>Step-by-Step Explanation</h2>
<h2>Real Examples</h2>
<h2>Common Mistakes</h2>
<h2>What You Should Do Next</h2>
<h2>FAQ</h2>
<h2>Sources</h2>

Write practical, specific education advice. Avoid generic filler.
`
}

async function callModel(prompt: string) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 7000,
  })

  return res.choices[0].message.content || ''
}

function fallbackFaq(title: string) {
  return [
    {
      question: `What is the main idea of ${title}?`,
      answer:
        'The main idea is to give students, teachers, or parents a practical way to understand the topic and apply it in real learning situations.',
    },
    {
      question: 'Who is this guide best for?',
      answer:
        'This guide is useful for students, educators, and families who want clear, practical education advice that can be applied step by step.',
    },
    {
      question: 'How should students use this advice?',
      answer:
        'Students should choose one or two strategies from the guide, apply them consistently, and review what improves their learning or academic performance.',
    },
    {
      question: 'How can teachers or parents support this process?',
      answer:
        'Teachers and parents can support learners by creating structure, giving feedback, and helping students reflect on what is working.',
    },
    {
      question: 'Why does this topic matter?',
      answer:
        'This topic matters because strong learning habits, clear explanations, and consistent practice can improve confidence and long-term academic outcomes.',
    },
  ]
}

function ensureFaqSection(article: GeneratedArticle) {
  const faq =
    Array.isArray(article.faq) && article.faq.length >= 5
      ? article.faq.slice(0, 5)
      : fallbackFaq(article.title)

  const hasFaqSection = /<h2>\s*FAQ\s*<\/h2>/i.test(article.content)

  if (!hasFaqSection) {
    article.content += `
<h2>FAQ</h2>
${faq
  .map(
    (item) => `
<h3>${item.question}</h3>
<p>${item.answer}</p>`
  )
  .join('\n')}
`
  }

  return {
    ...article,
    faq,
  }
}

function ensureMinimumLength(article: GeneratedArticle, brief: EducationBrief) {
  if (wordCount(article.content) >= 1200) {
    return article
  }

  article.content += `
<h2>Additional Practice Tips</h2>
<p>One of the best ways to use this advice is to turn it into a repeatable routine. Students often make better progress when they choose a small number of strategies and use them consistently instead of trying to change everything at once.</p>
<p>For example, a student working on ${brief.working_title} might start by setting one clear goal, practicing for a short period each day, and reviewing progress at the end of the week. This helps make learning more manageable and less overwhelming.</p>
<p>Teachers and parents can also support progress by asking simple reflection questions: What worked well? What felt difficult? What should change next time? These questions help students become more aware of their learning process.</p>

<h2>Classroom and Home Application</h2>
<p>In a classroom, this topic can be introduced through short demonstrations, guided practice, and independent application. Students benefit when they see examples first, then try the strategy with support, and finally use it on their own.</p>
<p>At home, parents can help by keeping routines simple. A quiet workspace, a clear checklist, and a regular review time can make education advice easier to follow. The goal is not perfection. The goal is steady improvement over time.</p>

<h2>How to Measure Progress</h2>
<p>Progress can be measured through completed assignments, improved confidence, stronger recall, better organization, or fewer repeated mistakes. Not every improvement will show up immediately in grades, but small changes in habits often lead to better outcomes over time.</p>
<p>A useful method is to keep a weekly learning note. Students can write down what they practiced, what improved, and what still needs work. This creates a simple feedback loop that supports long-term growth.</p>
`
  return article
}

export async function generateArticle(
  brief: EducationBrief
): Promise<GeneratedArticle> {
  let text = await callModel(buildPrompt(brief))
  let parsed = safeParse(text)

  if (wordCount(parsed.content || '') < 1200 || !parsed.faq || parsed.faq.length < 5) {
    text = await callModel(`
Rewrite this article again. The previous version failed validation.

Rules:
- At least 1,500 words
- Exactly 5 FAQ items in the JSON faq array
- FAQ section inside content
- Sources section inside content
- HTML only inside content
- Return ONLY valid JSON

Brief:
${buildPrompt(brief)}
`)
    parsed = safeParse(text)
  }

  parsed = ensureFaqSection(parsed)
  parsed = ensureMinimumLength(parsed, brief)
  parsed = ensureFaqSection(parsed)

  return {
    ...parsed,
    faq: parsed.faq || fallbackFaq(parsed.title),
    keywords: parsed.keywords || [],
  }
}