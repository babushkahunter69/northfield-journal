# Northfield Journal

A premium-feeling education publication starter built with Next.js 15 + Supabase.

## New in this version
- Dark mode with a client-side theme toggle
- Custom luxury-leaning visual identity with a monogram logo and warmer palette
- Featured image support across article cards and article pages
- Admin image uploads to Supabase Storage
- Real CMS editor at `/admin/editor` for creating and updating posts
- Markdown live preview, SEO fields, draft/publish controls, and featured toggles

## Features
- Public education homepage, archive, article pages, About, Contact, Privacy Policy, and Terms
- Guest post submission workflow with admin review and one-click publishing
- Newsletter subscriber capture via `/api/newsletter`
- Admin login using Supabase magic link auth
- Dynamic SEO metadata, canonical URLs, structured data, sitemap, and robots.txt
- Ad network placeholder component for AdSense or similar display ads
- PostgreSQL schema + row level security policies for Supabase
- Storage bucket setup for featured image uploads

## Quick start
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill the values.
4. Install deps: `npm install`
5. Run locally: `npm run dev`

## Admin workflow
- Go to `/admin/login`
- Sign in with the email set in `ADMIN_EMAIL`
- Manage guest submissions at `/admin/submissions`
- Create and edit articles at `/admin/editor`

## Important launch note
This is a strong premium starter, but it will look truly premium only after you replace the sample content, logos if desired, contact info, and legal placeholders with your own brand materials.
