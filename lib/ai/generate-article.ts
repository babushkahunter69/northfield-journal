import OpenAI from 'openai';
import type { GeneratedArticle, GeneratedBrief } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

type EducationBrief = GeneratedBrief & {
  audience?: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
};

function stripHtml(html: string) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(html: string) {
  const text = stripHtml(html);
  return text ? text.split(' ').filter(Boolean).length : 0;
}

function slugify(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function safeParse(text: string): Partial<GeneratedArticle> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain valid JSON.');
  }

  return JSON.parse(text.slice(start, end + 1)) as Partial<GeneratedArticle>;
}

function fallbackFaq(title: string) {
  return [
    {
      question: `What is the main idea of ${title}?`,
      answer:
        'The main idea is to give students, teachers, and families practical guidance they can apply in real learning situations.'
    },
    {
      question: 'Who is this guide for?',
      answer:
        'This guide is for students, educators, and families who want clear, practical education advice.'
    },
    {
      question: 'How should students use this advice?',
      answer:
        'Students should choose one or two strategies, apply them consistently, and review what improves their learning.'
    },
    {
      question: 'How can teachers or parents help?',
      answer:
        'Teachers and parents can help by giving structure, feedback, and encouragement while allowing students to build independence.'
    },
    {
      question: 'Why does this topic matter?',
      answer:
        'It matters because strong learning habits and clear academic strategies can improve confidence, focus, and long-term progress.'
    }
  ];
}

function ensureFaq(article: GeneratedArticle): GeneratedArticle {
  const faq =
    Array.isArray(article.faq) && article.faq.length >= 5
      ? article.faq.slice(0, 5)
      : fallbackFaq(article.title);

  let content = article.content || '';

  content = content.replace(
    /<h2[^>]*>\s*(FAQ|Frequently Asked Questions)\s*<\/h2>[\s\S]*?(?=<h2|$)/i,
    ''
  );

  content += `
<h2>Frequently Asked Questions</h2>
${faq
  .map(
    (item) => `
<h3>${item.question}</h3>
<p>${item.answer}</p>`
  )
  .join('\n')}
`;

  return { ...article, content, faq };
}

function ensureMinimumLength(article: GeneratedArticle, brief: EducationBrief): GeneratedArticle {
  if (wordCount(article.content) >= 950) return article;

  return {
    ...article,
    content:
      article.content +
      `
<h2>Putting These Ideas Into Practice</h2>
<p>The most useful education advice is the kind that can be applied consistently in real settings. Rather than trying to overhaul everything at once, students, teachers, and families usually get better results by choosing one or two practical changes and using them deliberately over time.</p>
<p>For ${brief.working_title}, that means starting with a simple routine, watching what improves, and adjusting the strategy when something is not working. A student might use a short checklist, a weekly reflection note, or a teacher-approved practice routine to make progress easier to track.</p>
<p>Teachers can support this process by modeling the strategy first, giving students guided practice, and then helping them use it independently. Parents can support the same process at home by creating a predictable study environment and asking calm, specific questions about what was learned.</p>

<h2>How to Measure Progress</h2>
<p>Progress is not always limited to grades. It can also appear as stronger confidence, better organization, fewer repeated mistakes, improved class participation, or a clearer understanding of what to do next. These signs matter because they show that the learner is developing a stronger process, not just completing a task once.</p>
<p>A simple way to measure progress is to review one question each week: what worked, what was difficult, and what should change next? This reflection helps students become more independent learners and helps teachers or parents provide more useful support.</p>

<h2>Sources</h2>
<ul>
<li><a href="https://ies.ed.gov/ncee/wwc/" target="_blank" rel="noopener noreferrer">Institute of Education Sciences: What Works Clearinghouse</a></li>
<li><a href="https://www.edutopia.org/" target="_blank" rel="noopener noreferrer">Edutopia education resources</a></li>
</ul>
`
  };
}

function normalizeArticle(parsed: Partial<GeneratedArticle>, brief: EducationBrief): GeneratedArticle {
  const title = String(parsed.title || brief.working_title || 'Education Guide').trim();
  const slug = slugify(parsed.slug || brief.slug || title);
  const excerpt = String(
    parsed.excerpt ||
      `A practical guide to ${title.toLowerCase()} for students, teachers, and families.`
  ).trim();
  const metaTitle = String(parsed.meta_title || title).trim();
  const metaDescription = String(
    parsed.meta_description ||
      excerpt ||
      `Learn practical, student-friendly strategies for ${title.toLowerCase()}.`
  ).trim();
  const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [brief.slug.replace(/-/g, ' ')];

  let article: GeneratedArticle = {
    title,
    slug,
    excerpt,
    content: String(parsed.content || '').trim(),
    meta_title: metaTitle,
    meta_description: metaDescription,
    keywords,
    category_slug: brief.category_slug,
    faq: Array.isArray(parsed.faq) ? parsed.faq : []
  };

  if (!article.content) {
    article.content = `<p>${excerpt}</p>`;
  }

  article = ensureMinimumLength(article, brief);
  article = ensureFaq(article);

  return article;
}

function buildPrompt(brief: EducationBrief) {
  return `
You are an expert education writer for Northfield Journal.

Return ONLY valid JSON in this exact shape:
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

Mandatory rules:
- Write at least 1,200 words in the content field.
- HTML only inside content. No markdown.
- Use <p>, <h2>, <h3>, <ul>, <li>.
- The faq JSON array must contain exactly 5 items.
- The content must include <h2>Frequently Asked Questions</h2> with matching questions.
- Include at least 2 source links in a Sources section.
- Avoid generic filler and hype.

Required sections:
<h2>Quick Answer</h2>
<h2>Key Takeaways</h2>
<h2>Why This Matters</h2>
<h2>Step-by-Step Explanation</h2>
<h2>Real Examples</h2>
<h2>Common Mistakes</h2>
<h2>What You Should Do Next</h2>
<h2>Frequently Asked Questions</h2>
<h2>Sources</h2>

Write practical, specific education advice that helps a real student, teacher, or parent.
`;
}

async function callModel(prompt: string) {
  const res = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 6500
  });

  return res.choices[0].message.content || '';
}

export async function generateArticle(brief: EducationBrief): Promise<GeneratedArticle> {
  const text = await callModel(buildPrompt(brief));
  const parsed = safeParse(text);
  return normalizeArticle(parsed, brief);
}
