export type PostStatus = 'draft' | 'published';
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';
export type SubscriberStatus = 'subscribed' | 'unsubscribed';

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Author = {
  name: string;
  slug: string;
  bio: string | null;
  avatarInitials: string;
  articleCount?: number;
  latestPublishedAt?: string | null;
};

export type Post = {
  og_image_url?: string | null;
  canonical_url?: string | null;
  generation_status?: string | null;
  source_type?: string | null;
  faq_json?: Array<{ question: string; answer: string }> | null;
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string | null;
  author_name: string;
  author_bio: string | null;
  author?: Author;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  is_featured: boolean;
  status: PostStatus;
  reading_time_minutes: number;
  published_at: string | null;
  created_at: string;
  updated_at?: string;
  categories?: Category | null;
};

export type Submission = {
  id: string;
  full_name: string;
  email: string;
  bio: string | null;
  proposed_title: string;
  topic_category: string;
  target_keyword: string | null;
  article_angle: string | null;
  target_audience: string | null;
  source_links: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  article_content: string;
  notes: string | null;
  consent_original: boolean;
  status: SubmissionStatus;
  created_at: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  full_name: string | null;
  status: SubscriberStatus;
  created_at: string;
};

export type EditorPayload = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  author_name: string;
  author_bio: string;
  category_id: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  is_featured: boolean;
  status: PostStatus;
};

export type ContentKeywordStatus = 'candidate' | 'queued' | 'in_progress' | 'done' | 'rejected' | 'skipped';

export type ContentKeyword = {
  id: string;
  keyword: string;
  cluster: string | null;
  search_intent: string | null;
  audience: string | null;
  priority: number;
  country_code: string | null;
  status: ContentKeywordStatus;
  last_generated_at: string | null;
  created_at: string;
};

export type ContentBriefRow = {
  id: string;
  keyword_id: string;
  working_title: string;
  slug: string;
  angle: string | null;
  outline_json: Array<{ heading: string; notes: string }> | null;
  seo_title: string | null;
  seo_description: string | null;
  target_word_count: number | null;
  internal_links_json: string[] | null;
  external_sources_json: string[] | null;
  status: string;
  created_at: string;
};

export type GeneratedBrief = {
  working_title: string;
  slug: string;
  angle: string;
   audience?: string | null
  grade_band?: string | null
  subject_area?: string | null
  seo_title: string;
  seo_description: string;
  target_word_count: number;
  secondary_keywords: string[];
  outline: Array<{ heading: string; notes: string }>;
  faq: Array<{ question: string; answer: string }>;
  internal_link_suggestions: string[];
  category_slug: string;
};

export type GeneratedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  category_slug: string;
  faq: Array<{ question: string; answer: string }>;
};
