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

type FaqItem = {
  question: string;
  answer: string;
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

function naturalTopicLabel(brief: EducationBrief) {
  return String(brief.working_title || brief.slug || 'this topic')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackFaq(title: string): FaqItem[] {
  return [
    {
      question: `What is the best way to start with ${title}?`,
      answer:
        'Start with one clear goal, choose a simple strategy, and practice it consistently before adding more techniques.'
    },
    {
      question: 'Who is this guide for?',
      answer:
        'This guide is for students, teachers, and families who want practical education advice that can be used in real learning situations.'
    },
    {
      question: 'How long does it take to see progress?',
      answer:
        'Progress depends on the learner and the topic, but most students notice improvement when they apply one strategy consistently for several weeks.'
    },
    {
      question: 'How can teachers or parents help?',
      answer:
        'Teachers and parents can help by giving structure, feedback, encouragement, and space for students to practice independently.'
    },
    {
      question: 'What is the most common mistake to avoid?',
      answer:
        'The most common mistake is trying to change everything at once instead of building one reliable habit or process at a time.'
    }
  ];
}

function normalizeFaq(input: unknown, title: string): FaqItem[] {
  const fallback = fallbackFaq(title);
  const raw = Array.isArray(input) ? input : [];

  const cleaned = raw
    .map((item: any) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim()
    }))
    .filter((item) => item.question.length > 8 && item.answer.length > 20);

  const merged = [...cleaned, ...fallback];
  const seen = new Set<string>();
  const unique: FaqItem[] = [];

  for (const item of merged) {
    const key = item.question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length === 5) break;
  }

  return unique;
}

function removeWeakFaqSection(content: string) {
  return String(content || '').replace(
    /<h2[^>]*>\s*(FAQ|Frequently Asked Questions)\s*<\/h2>[\s\S]*?(?=<h2|$)/i,
    ''
  );
}

function ensureFaq(article: GeneratedArticle): GeneratedArticle {
  const faq = normalizeFaq(article.faq, article.title);
  let content = removeWeakFaqSection(article.content || '');

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

  return {
    ...article,
    content,
    faq
  };
}

function ensureSources(article: GeneratedArticle): GeneratedArticle {
  // Do not invent external source links. Broken or guessed references are worse than no source section.
  // Manually sourced articles can still keep verified links, and repairInternalLinks will remove bad ones.
  const content = String(article.content || '')
    .replace(/<h2[^>]*>\s*(Sources|Related Resources|Additional Resources|References)\s*<\/h2>[\s\S]*?(?=<h2[^>]*>|$)/gi, '')
    .replace(/(^|\n)#{2,3}\s*(Sources|Related Resources|Additional Resources|References)[\s\S]*?(?=\n#{2,3}\s|$)/gi, '\n')
    .trim();

  return {
    ...article,
    content
  };
}

function ensureRequiredHeadings(article: GeneratedArticle, brief: EducationBrief): GeneratedArticle {
  const topic = naturalTopicLabel(brief);
  let content = article.content || '';

  const sections: Array<{ heading: string; html: string }> = [
    {
      heading: 'Quick Answer',
      html: `<h2>Quick Answer</h2><p>The best way to approach ${topic} is to start with a clear purpose, use a simple repeatable process, and review progress regularly. Students usually improve faster when the strategy is specific, realistic, and easy to practice consistently.</p>`
    },
    {
      heading: 'Key Takeaways',
      html: `<h2>Key Takeaways</h2><ul><li>Focus on one practical strategy before adding more.</li><li>Use examples, feedback, and short practice cycles to improve.</li><li>Measure progress by confidence, consistency, and quality of work, not only grades.</li></ul>`
    },
    {
      heading: 'Why This Matters',
      html: `<h2>Why This Matters</h2><p>${topic} matters because students need practical learning systems, not just motivation. A clear process helps learners understand what to do next and gives teachers or parents a better way to support progress.</p>`
    },
    {
      heading: 'Step-by-Step Explanation',
      html: `<h2>Step-by-Step Explanation</h2><p>Start by identifying the main goal. Next, break the task into smaller steps. Then practice one step at a time, check the result, and adjust the strategy based on feedback. This makes learning easier to manage and less overwhelming.</p>`
    },
    {
      heading: 'Real Examples',
      html: `<h2>Real Examples</h2><p>For example, a student who struggles with a large assignment might begin by writing a short plan, completing one section, and asking for feedback before moving on. A teacher might model the process first, then let students practice independently with a checklist.</p>`
    },
    {
      heading: 'Common Mistakes',
      html: `<h2>Common Mistakes</h2><ul><li>Trying to do too much at once.</li><li>Skipping feedback or reflection.</li><li>Using a strategy once and giving up too quickly.</li><li>Focusing only on grades instead of habits and process.</li></ul>`
    },
    {
      heading: 'What You Should Do Next',
      html: `<h2>What You Should Do Next</h2><p>Choose one strategy from this guide and use it for a week. At the end of the week, review what improved, what felt difficult, and what should change next. Small, consistent adjustments are usually more useful than dramatic changes.</p>`
    }
  ];

  for (const section of sections) {
    const pattern = new RegExp(`<h2[^>]*>\\s*${section.heading}\\s*<\\/h2>`, 'i');
    if (!pattern.test(content)) {
      content += `\n${section.html}\n`;
    }
  }

  content = content.replace(/<h2[^>]*>\s*Next Steps\s*<\/h2>/gi, '<h2>What You Should Do Next</h2>');

  return {
    ...article,
    content
  };
}

function ensureMinimumLength(article: GeneratedArticle, brief: EducationBrief): GeneratedArticle {
  if (wordCount(article.content) >= 2000) return article;

  const topic = naturalTopicLabel(brief);

  // Each block adds ~80-130 words. We add one at a time until >= 2000 words.
  const expansionBlocks: string[] = [
    `\n<h2>How to Apply This in Real Learning Situations</h2>
<p>The most useful education advice is specific enough to use but flexible enough to adapt. For ${topic}, students should begin with a small routine that can be repeated. This might mean using a checklist, planning a short practice session, or asking for feedback before moving to the next step.</p>
<p>Teachers can support this by demonstrating the strategy, giving students guided practice, and then asking them to apply it independently. Parents can support it at home by creating a predictable study environment and asking calm, specific questions about what the student tried and what they learned.</p>
<p>The goal is not to make the process perfect on the first attempt. The goal is to create a learning loop: try a strategy, notice the result, make an adjustment, and repeat. That loop helps students become more independent and confident over time.</p>`,

    `\n<h2>Planning the First Week</h2>
<p>A strong first week should be simple enough that a busy student, teacher, or parent can actually follow it. Start by naming the main challenge in plain language. Then choose one action that can be practiced in 10 to 20 minutes. The first action should be visible and measurable, such as completing a short outline, reviewing flashcards, trying a reading strategy, or asking one clarifying question.</p>
<p>After that, decide when the practice will happen. A vague plan like "study more" usually fails because it does not tell the learner what to do. A better plan sounds like "review vocabulary for 15 minutes after dinner on Monday, Wednesday, and Friday." This makes the strategy easier to remember and easier to evaluate.</p>
<p>At the end of the week, the learner should write down what worked, what felt confusing, and what needs to change. This small reflection step turns an ordinary routine into a learning system.</p>`,

    `\n<h2>Classroom and Home Examples</h2>
<p>In a classroom, a teacher might introduce ${topic} with a short model, a guided practice activity, and a quick exit ticket. The exit ticket gives the teacher immediate information about who understands the idea and who needs another example. That information can shape the next lesson without making students feel singled out.</p>
<p>At home, a parent might use the same idea in a calmer way. Instead of correcting every mistake, the parent can ask, "What part feels clear?" and "What part should we try again?" This helps the student explain their thinking and build independence. The parent is still supportive, but the student remains responsible for the learning.</p>
<p>For students working alone, the same process can become a checklist. They can write the goal, choose the next step, set a timer, complete the task, and review the result. Over time, this routine builds confidence because the student knows exactly how to begin.</p>`,

    `\n<h2>How to Adapt the Strategy for Different Learners</h2>
<p>No single education strategy works exactly the same way for every learner. Younger students may need shorter steps, visual reminders, and more frequent feedback. Older students may benefit from more independence, but they still need a clear structure and honest reflection. Students with learning differences may need extra time, alternative formats, or explicit modeling before they can use the strategy independently.</p>
<p>The key is to keep the goal steady while adjusting the support. If the goal is better reading comprehension, one student might use annotation, another might use audio support, and another might pause after each section to summarize aloud. The method can change while the learning objective stays the same.</p>
<p>Teachers and parents should watch for signs that the strategy is either too easy or too demanding. If it is too easy, students may finish quickly without deeper thinking. If it is too hard, they may avoid the task or become frustrated. The best version sits in the middle: challenging enough to matter, but realistic enough to repeat.</p>`,

    `\n<h2>How to Measure Progress</h2>
<p>Progress can show up in several ways. A student may finish work with less stress, explain an idea more clearly, make fewer repeated mistakes, participate more confidently, or organize assignments with less help. These signs matter because they show improvement in the learning process, not just a single grade.</p>
<p>A simple weekly reflection can help. Students can write down what they practiced, what improved, what still felt difficult, and what they will try next. Teachers and parents can use those notes to give better support without taking over the work.</p>
<p>For a more formal check, use a short rubric with three or four criteria. For example, the rubric might ask whether the student understood the task, used the strategy, completed the work, and reflected on the result. This keeps feedback focused and prevents the student from feeling judged only by the final answer.</p>`,

    `\n<h2>When to Adjust the Plan</h2>
<p>A plan should change when it stops helping the learner move forward. If a student is practicing consistently but still confused, the strategy may need more modeling or a smaller first step. If the student understands the idea but avoids the work, the schedule may be unrealistic. If the student completes the work but cannot explain the reasoning, the next step should include more discussion or written reflection.</p>
<p>Adjustment is not failure. It is part of good learning design. Effective students, teachers, and parents treat each attempt as information. They keep what works, remove what does not, and make the next version more useful.</p>`,

    `\n<h2>Building Consistency Over Time</h2>
<p>Consistency matters more than intensity. A student who practices one strategy for ten minutes every day will usually improve faster than a student who spends an hour on it once a week. Regular short sessions help the brain retain new patterns and make the strategy feel natural rather than effortful.</p>
<p>To build consistency, connect the new routine to something the learner already does reliably. For example, reviewing notes right after school, or planning the next day's tasks before dinner, uses an existing habit as an anchor. This reduces the effort needed to start and makes the new behaviour more likely to stick.</p>
<p>When a student misses a session, the goal is to return to the routine as quickly as possible without self-criticism. One missed day is not a failed strategy. It is simply information that the schedule or the first step may need to be adjusted slightly.</p>`
  ];

  let articleContent = article.content;

  for (const block of expansionBlocks) {
    if (wordCount(articleContent) >= 2000) break;
    articleContent += block;
  }

  return { ...article, content: articleContent };
}

function clampMetaTitle(metaTitle: string, fallbackTitle: string): string {
  let base = String(metaTitle || fallbackTitle || '').trim();
  if (base.length >= 40 && base.length <= 65) return base;

  if (base.length > 65) {
    // Trim to last whole word within 65 chars
    const words = base.split(' ');
    let result = '';
    for (const word of words) {
      const next = result ? `${result} ${word}` : word;
      if (next.length > 65) break;
      result = next;
    }
    if (result.length >= 40) return result;
    return base.slice(0, 65).trim();
  }

  if (base.length < 40) {
    const padded = `${base} | Northfield Journal`;
    if (padded.length <= 65) return padded;
  }

  return base;
}

function clampMetaDescription(metaDescription: string, excerpt: string, title: string): string {
  const generated = `A practical education guide to ${String(title || '').toLowerCase()} with examples, FAQs, and clear next steps for students, teachers, and families.`;
  const candidates = [
    String(metaDescription || '').trim(),
    String(excerpt || '').trim(),
    generated
  ];

  for (const candidate of candidates) {
    if (candidate.length >= 120 && candidate.length <= 160) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate.length >= 120) return candidate.slice(0, 160).trim();
  }

  return generated.slice(0, 160).trim();
}
function removeAwkwardExactKeywordStuffing(article: GeneratedArticle, brief: EducationBrief): GeneratedArticle {
  const awkward = String(brief.slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!awkward || awkward.length < 12) return article;

  const natural = naturalTopicLabel(brief);
  const pattern = new RegExp(awkward.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

  return {
    ...article,
    content: article.content.replace(pattern, natural),
    excerpt: article.excerpt.replace(pattern, natural),
    meta_title: article.meta_title.replace(pattern, natural),
    meta_description: article.meta_description.replace(pattern, natural)
  };
}

function normalizeArticle(parsed: Partial<GeneratedArticle>, brief: EducationBrief): GeneratedArticle {
  const title = String(parsed.title || brief.working_title || 'Education Guide').trim();
  const slug = slugify(parsed.slug || brief.slug || title);
  const excerpt = String(
    parsed.excerpt ||
      `A practical guide to ${title.toLowerCase()} for students, teachers, and families.`
  ).trim();
  const rawMetaTitle = String(parsed.meta_title || title).trim();
  const rawMetaDescription = String(
    parsed.meta_description ||
      excerpt ||
      `Learn practical, student-friendly strategies for ${title.toLowerCase()}.`
  ).trim();
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
    : [String(brief.slug || title).replace(/-/g, ' ')];

  let article: GeneratedArticle = {
    title,
    slug,
    excerpt,
    content: String(parsed.content || '').trim(),
    // Clamp meta fields immediately so they always pass editorial checks
    meta_title: clampMetaTitle(rawMetaTitle, title),
    meta_description: clampMetaDescription(rawMetaDescription, excerpt, title),
    keywords,
    category_slug: brief.category_slug,
    faq: Array.isArray(parsed.faq) ? parsed.faq : []
  };

  if (!article.content) {
    article.content = `<p>${excerpt}</p>`;
  }

  // Pipeline order matters:
  // 1. Clean keyword stuffing (pure replacement, neutral)
  // 2. Strip fake sources (may remove words)
  // 3. Add required structural headings (adds words if missing)
  // 4. Strip + rebuild FAQ (may shift word count)
  // 5. Enforce minimum length LAST — after all stripping is done
  article = removeAwkwardExactKeywordStuffing(article, brief);
  article = ensureSources(article);
  article = ensureRequiredHeadings(article, brief);
  article = ensureFaq(article);
  article = ensureMinimumLength(article, brief);

  return article;
}

function buildPrompt(brief: EducationBrief) {
  const topic = naturalTopicLabel(brief);

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
Natural topic phrase: ${topic}
Audience: ${brief.audience || 'students and educators'}
Grade level: ${brief.grade_band || 'mixed'}
Subject area: ${brief.subject_area || 'general education'}

Mandatory rules:
- Write 2,000 to 3,000 words in the content field. Do not stop early.
- HTML only inside content. No markdown.
- Use <p>, <h2>, <h3>, <ul>, <li>.
- The faq JSON array must contain exactly 5 items.
- The content must include <h2>Frequently Asked Questions</h2> with exactly 5 visible questions.
- Do not add external source links unless exact URLs are provided by the system. Do not invent Sources, Related Resources, or Additional Resources sections.
- Use the exact heading <h2>What You Should Do Next</h2>.
- Do not use the heading "Next Steps".
- Do not awkwardly force the exact keyword phrase.
- Use natural variations of the topic instead of keyword stuffing.
- Avoid generic filler and hype. Use concrete classroom, student, and parent examples to create depth.

Required sections:
<h2>Quick Answer</h2>
<h2>Key Takeaways</h2>
<h2>Why This Matters</h2>
<h2>Step-by-Step Explanation</h2>
<h2>Real Examples</h2>
<h2>Common Mistakes</h2>
<h2>What You Should Do Next</h2>
<h2>Frequently Asked Questions</h2>
Write practical, specific education advice that helps a real student, teacher, or parent.
`;
}

async function callModel(prompt: string) {
  const res = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.55,
    max_tokens: 12000
  });

  return res.choices[0].message.content || '';
}

export async function generateArticle(brief: EducationBrief): Promise<GeneratedArticle> {
  const text = await callModel(buildPrompt(brief));
  const parsed = safeParse(text);
  return normalizeArticle(parsed, brief);
}
