export type SiteKey = 'cashclimb' | 'northfield'

export type AutoAuthor = {
  name: string
  role: string
  bio: string
  initials: string
  reviewerName: string
  reviewerRole: string
  reviewerBio: string
}

export type AuthorAssignment = {
  author: AutoAuthor
  reason: string
  matchedTopic: string
  matchedTerms: string[]
  score: number
}

const NORTHFIELD_REVIEWER = {
  reviewerName: 'Northfield Journal Education Review Desk',
  reviewerRole: 'Education Review Desk',
  reviewerBio:
    'Northfield Journal reviews education content for clarity, practical usefulness, and alignment with established learning principles.',
}

export const NORTHFIELD_AUTHORS = {
  emily: {
    name: 'Emily Carter',
    role: 'Study Skills Specialist',
    bio:
      'Emily Carter writes about study skills, learning systems, productivity, motivation, and academic improvement for students and lifelong learners.',
    initials: 'EC',
    ...NORTHFIELD_REVIEWER,
  },
  mark: {
    name: 'Mark Reyes',
    role: 'Academic Writing Coach',
    bio:
      'Mark Reyes covers academic writing, essays, research projects, thesis statements, citations, outlines, and practical ways students can communicate ideas clearly.',
    initials: 'MR',
    ...NORTHFIELD_REVIEWER,
  },
  aisha: {
    name: 'Aisha Patel',
    role: 'Exam Preparation Specialist',
    bio:
      'Aisha Patel writes about exam preparation, revision planning, study schedules, test confidence, and practical strategies for performing well under pressure.',
    initials: 'AP',
    ...NORTHFIELD_REVIEWER,
  },
  laura: {
    name: 'Laura Bennett',
    role: 'Parent Education Writer',
    bio:
      'Laura Bennett writes practical guides for parents on homework routines, school support, homeschooling, and helping children build confidence as learners.',
    initials: 'LB',
    ...NORTHFIELD_REVIEWER,
  },
  samuel: {
    name: 'Dr. Samuel Brooks',
    role: 'Inclusive Education Specialist',
    bio:
      'Dr. Samuel Brooks focuses on inclusive education, learning differences, classroom accommodations, IEP support, ADHD, dyslexia, and practical support for diverse learners.',
    initials: 'SB',
    ...NORTHFIELD_REVIEWER,
  },
} satisfies Record<string, AutoAuthor>

const NORTHFIELD_AUTHOR_LIST = Object.values(NORTHFIELD_AUTHORS)

type TopicRule = {
  key: keyof typeof NORTHFIELD_AUTHORS
  topic: string
  reason: string
  weight: number
  terms: string[]
}

const TOPIC_RULES: TopicRule[] = [
  {
    key: 'samuel',
    topic: 'learning differences and inclusive education',
    reason: 'special education signal detected: learning differences, accommodations, IEP, ADHD, dyslexia, neurodiversity, or inclusive education',
    weight: 12,
    terms: [
      'learning disability', 'learning disabilities', 'learning difference', 'learning differences',
      'inclusive education', 'inclusive classroom', 'inclusive classrooms', 'inclusion',
      'diverse learner', 'diverse learners', 'neurodiverse', 'neurodiversity',
      'special education', 'special needs', 'iep', '504 plan', '504',
      'accommodation', 'accommodations', 'classroom accommodation', 'classroom accommodations',
      'adhd', 'dyslexia', 'autism', 'individualized education', 'differentiated instruction',
      'assistive technology', 'struggling reader', 'struggling readers', 'dyscalculia', 'dysgraphia'
    ]
  },
  {
    key: 'mark',
    topic: 'academic writing and research',
    reason: 'academic writing signal detected: essay, thesis, research, citation, outline, paragraph, or writing assignment',
    weight: 10,
    terms: [
      'essay', 'essays', 'essay writing', 'academic writing', 'writing assignment',
      'thesis', 'thesis statement', 'research', 'research paper', 'paper',
      'citation', 'citations', 'bibliography', 'outline', 'outlining',
      'paragraph', 'introduction', 'conclusion', 'draft', 'drafting', 'revision writing'
    ]
  },
  {
    key: 'aisha',
    topic: 'exam preparation and test performance',
    reason: 'exam-prep signal detected: exam, test prep, revision, finals, standardized tests, or test anxiety',
    weight: 10,
    terms: [
      'exam', 'exams', 'exam prep', 'exam preparation', 'test prep', 'test preparation',
      'revision', 'study schedule', 'sat', 'act', 'gcse', 'finals', 'midterms',
      'assessment', 'practice test', 'mock exam', 'standardized test', 'test anxiety',
      'exam anxiety', 'test taking', 'test-taking'
    ]
  },
  {
    key: 'laura',
    topic: 'parent and at-home learning support',
    reason: 'parent/family signal detected: parents, homework support, homeschool, family learning, or helping your child at home',
    weight: 9,
    terms: [
      'parent', 'parents', 'parenting', 'parent guide', 'parents guide',
      'homework', 'homework help', 'supporting homework', 'homeschool', 'home school',
      'family learning', 'families', 'guardian', 'guardians', 'at home', 'at-home',
      'home learning', 'help your child', 'helping your child', 'support your child',
      'supporting your child', 'child homework', 'children homework'
    ]
  },
  {
    key: 'emily',
    topic: 'study skills and general student success',
    reason: 'general student-success signal detected: study skills, motivation, focus, productivity, time management, or learning habits',
    weight: 7,
    terms: [
      'study skills', 'study habits', 'study effectively', 'student success', 'motivation',
      'staying motivated', 'focus', 'productivity', 'time management', 'memory',
      'note taking', 'notetaking', 'learning habits', 'learning systems', 'active recall',
      'spaced repetition', 'organization', 'class notes', 'academic improvement'
    ]
  }
]

const AUTHOR_PRIORITY: Array<keyof typeof NORTHFIELD_AUTHORS> = [
  'samuel',
  'mark',
  'aisha',
  'laura',
  'emily',
]

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function termHits(text: string, terms: string[]) {
  const normalizedText = ` ${normalize(text)} `
  const hits: string[] = []

  for (const term of terms) {
    const normalizedTerm = normalize(term)
    if (!normalizedTerm) continue

    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i')

    if (pattern.test(normalizedText)) hits.push(term)
  }

  return Array.from(new Set(hits))
}

function weightedHitsForRule(rule: TopicRule, fields: { primary: string; secondary: string; body: string }) {
  const primaryHits = termHits(fields.primary, rule.terms)
  const secondaryHits = termHits(fields.secondary, rule.terms)
  const bodyHits = termHits(fields.body, rule.terms)

  const allowBodyHits = rule.key === 'samuel'

  const score =
    primaryHits.length * rule.weight * 5 +
    secondaryHits.length * rule.weight * 2 +
    (allowBodyHits ? bodyHits.length * rule.weight : 0)

  return {
    hits: Array.from(new Set([...primaryHits, ...secondaryHits, ...(allowBodyHits ? bodyHits : [])])),
    score,
  }
}

export function getNorthfieldAuthorAssignment(input?: {
  keyword?: string | null
  primaryKeyword?: string | null
  title?: string | null
  excerpt?: string | null
  content?: string | null
  category?: string | null
  cluster?: string | null
  searchIntent?: string | null
} | string | null): AuthorAssignment {
  const source = typeof input === 'string' ? { keyword: input } : input || {}

  const primaryText = normalize([
    source.keyword,
    source.primaryKeyword,
    source.title,
    source.category,
    source.cluster,
    source.searchIntent,
  ].filter(Boolean).join(' '))

  const secondaryText = normalize([source.excerpt].filter(Boolean).join(' '))
  const bodyText = normalize(String(source.content || ''))

  const ranked = TOPIC_RULES.map((rule) => {
    const hitData = weightedHitsForRule(rule, {
      primary: primaryText,
      secondary: secondaryText,
      body: bodyText,
    })

    return {
      rule,
      ...hitData,
      priorityPenalty: AUTHOR_PRIORITY.indexOf(rule.key),
    }
  }).sort((a, b) => b.score - a.score || a.priorityPenalty - b.priorityPenalty)

  const winner = ranked[0]

  if (winner && winner.score > 0) {
    return {
      author: NORTHFIELD_AUTHORS[winner.rule.key],
      reason: winner.rule.reason,
      matchedTopic: winner.rule.topic,
      matchedTerms: winner.hits.slice(0, 8),
      score: winner.score,
    }
  }

  return {
    author: NORTHFIELD_AUTHORS.emily,
    reason: 'no specialist, parent, writing, or exam-prep signal detected, so the post is routed to general study skills',
    matchedTopic: 'study skills and general student success',
    matchedTerms: [],
    score: 0,
  }
}

export function getNorthfieldAuthor(input?: Parameters<typeof getNorthfieldAuthorAssignment>[0]): AutoAuthor {
  return getNorthfieldAuthorAssignment(input).author
}

export function getNorthfieldAuthorByName(name?: string | null): AutoAuthor | null {
  const value = String(name || '').trim().toLowerCase()
  if (!value) return null

  return (
    NORTHFIELD_AUTHOR_LIST.find((author) => author.name.toLowerCase() === value) ||
    NORTHFIELD_AUTHOR_LIST.find((author) => value.includes(author.name.toLowerCase())) ||
    null
  )
}

export function getAutoAuthor(site: SiteKey, category?: string): AutoAuthor {
  const c = category?.toLowerCase() || ''

  if (site === 'cashclimb') {
    if (
      c.includes('side hustle') ||
      c.includes('make money') ||
      c.includes('income') ||
      c.includes('personal finance')
    ) {
      return {
        name: 'Daniel Reeves',
        role: 'Personal Finance Writer',
        bio: 'Daniel Reeves writes practical money advice focused on better habits, stronger savings, and realistic ways to increase income.',
        initials: 'DR',
        reviewerName: 'CashClimb Review Desk',
        reviewerRole: 'Editorial Review Team',
        reviewerBio: 'CashClimb articles are reviewed for clarity, usefulness, and responsible financial education. Content is informational only and is not personal financial advice.',
      }
    }

    return {
      name: 'Sophie Tran',
      role: 'Finance Writer',
      bio: 'Sophie Tran covers budgeting, digital banking, and simple financial systems that help readers stay organized and in control.',
      initials: 'ST',
      reviewerName: 'CashClimb Review Desk',
      reviewerRole: 'Editorial Review Team',
      reviewerBio: 'CashClimb articles are reviewed for clarity, usefulness, and responsible financial education. Content is informational only and is not personal financial advice.',
    }
  }

  return getNorthfieldAuthor(category)
}
