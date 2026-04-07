export const siteConfig = {
  name: 'Northfield Journal',
  shortName: 'NJ',
  tagline: 'An independent education publication for students, teachers, school leaders, and families.',
  description:
    'Northfield Journal publishes thoughtful, practical education reporting, study strategies, classroom ideas, and expert commentary with a polished editorial standard.',
  defaultKeywords: [
    'education magazine',
    'student success strategies',
    'teaching ideas',
    'education guest post',
    'edtech publication',
    'school leadership blog'
  ],
  primaryTopic: 'Education',
  nav: [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Journal' },
    { href: '/about', label: 'About' },
    { href: '/guest-post', label: 'Contribute' },
    { href: '/contact', label: 'Contact' }
  ],
  socialProof: {
    contributors: '40+',
    monthlyReaders: '18k',
    avgTimeOnPage: '6.4 min'
  }
};

export const guestPostRules = [
  'Send original work only. We do not accept recycled, spun, ghost-generated, or previously published articles.',
  'Aim for 1,200 to 2,500 words with a clear point of view, useful examples, and a strong editorial angle.',
  'Back claims with lived experience, classroom practice, reporting, or credible sources.',
  'Write like a practitioner or editor, not a content mill. We prefer specificity over filler.',
  'Avoid overt self-promotion. One relevant bio link is fine; sales copy is not.',
  'Education topics only: student success, teaching craft, edtech, higher education, school systems, scholarships, careers, and academic writing.'
];

export const editorialPillars = [
  {
    title: 'Student success',
    description: 'Study systems, revision habits, focus, memory, exam prep, and academic confidence.'
  },
  {
    title: 'Teaching craft',
    description: 'Lesson design, formative assessment, classroom culture, tutoring, and practical pedagogy.'
  },
  {
    title: 'Education systems',
    description: 'School leadership, parent communication, scholarships, college access, and policy-adjacent explainers.'
  },
  {
    title: 'EdTech that helps',
    description: 'Careful, non-hype coverage of digital tools that actually improve learning outcomes.'
  }
];

export const monetizationChannels = [
  'Display ads such as Google AdSense or Mediavine later on',
  'Sponsored editorials and brand-safe partner features',
  'Affiliate revenue from education tools, courses, and software',
  'Lead capture for tutoring, consulting, workshops, or premium newsletters'
];

export const storageBucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'post-media';