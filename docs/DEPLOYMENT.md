# Deployment Guide

## Stack
- **Frontend + backend app:** Next.js on Vercel
- **Database + auth:** Supabase
- **Media uploads:** Supabase Storage bucket (`post-media` by default)
- **Domain:** your registrar of choice connected to Vercel

## 1) Create the backend
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. This creates database tables and a public storage bucket for featured images.
4. In Authentication > URL Configuration:
   - Site URL: `https://yourdomain.com`
   - Redirect URL: `https://yourdomain.com/auth/callback`
5. Copy these values:
   - Project URL
   - anon public key
   - service role key

## 2) Configure environment variables
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_STORAGE_BUCKET` (optional, defaults to `post-media`)
- `NEXT_PUBLIC_ADSENSE_CLIENT` (optional until monetization)

## 3) Run locally
```bash
npm install
npm run dev
```

## 4) Editorial workflow
- Sign in at `/admin/login`
- Review guest posts at `/admin/submissions`
- Open `/admin/editor`
- Upload a featured image
- Write or edit content
- Save as draft or publish

## 5) Deploy to Vercel
1. Import your GitHub repo into Vercel.
2. Add the environment variables from `.env.local`.
3. Deploy.
4. Add your custom domain in Vercel.
5. Update `NEXT_PUBLIC_SITE_URL` to your final production URL.
6. Redeploy so canonical tags, sitemap, and metadata point to the right domain.

## 6) Go-live checklist
- Replace placeholder policy pages with final legal text
- Replace demo editorial copy with your actual publication voice
- Add your real contact email
- Publish 15 to 30 high-quality original articles
- Set real ad unit IDs once approved
- Test guest submission flow and admin publishing flow
- Confirm newsletter signups are being stored in Supabase
- Confirm image uploads are landing in the storage bucket

## 7) Monetization roadmap
### Phase 1: trust
- Publish strong cornerstone articles
- Build topical clusters around your key education niches
- Capture emails from day one

### Phase 2: first revenue
- Turn on AdSense or another display ad network
- Add affiliate recommendations in genuinely relevant content
- Offer paid newsletter sponsorships or partner placements

### Phase 3: premium revenue
- Sell downloadable resources, workshops, or tutoring leads
- Offer sponsored editorial packages selectively
- Build a private newsletter or membership layer later if needed
