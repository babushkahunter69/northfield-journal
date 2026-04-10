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