# NEXUS Public Creator SEO Pages

## Routes
- `/creator/:username` serves a server-rendered public creator portfolio.
- `/creator/:username/post/:postId` serves a server-rendered, post-specific SEO page.
- `/sitemap.xml` lists public creator profile URLs. The existing `/robots.txt` points crawlers to it.

## Rendering and metadata
The Vercel API route reads public profile/post rows through the Supabase anon key and existing RLS policies. It emits title, meta description, canonical URL, Open Graph and Twitter card tags, plus Schema.org ProfilePage or SocialMediaPosting JSON-LD. The page HTML includes crawlable text and direct links to each public post. Responses are cached briefly at the edge.

Only profiles with `is_private = false` and posts with `status = ready`, `moderation_state = approved`, and `visibility = public` are returned. The API uses no service-role key and performs no writes. Invalid handles/post IDs return 400; missing or private content returns 404.

## Creator workspace
The Creator Portfolio shows public posts and provides links to the public profile and each post SEO page, plus copy-link controls and per-post SEO previews.

## Deployment requirements
- Deploy the latest `main` branch to Vercel before expecting these URLs to resolve.
- Vercel server environment must expose the existing Supabase project URL and anon/publishable key through one of: `SUPABASE_URL` or `VITE_SUPABASE_URL`, and `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`, or `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Never configure a service-role key for these read-only public pages.
- No SQL migration is required. Existing public profile and post RLS policies remain the access boundary.
- Submit `https://nexuseditor-omega.vercel.app/sitemap.xml` to Google Search Console after deployment. Indexing is controlled by search engines and is not immediate.

## Validation still required
Run the repository CI/build checks, deploy to Vercel, then verify public profile, public post, private profile (404), non-public post (404), metadata and sitemap responses. Confirm a profile with a real public username and at least one approved public post.
