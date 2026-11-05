# Builds 13–14 — Mobile, Brand, SEO and Release Readiness
## Build 13 — Mobile Experience and Performance
- Creative Fabric is lazy-loaded as a separate browser chunk, reducing eager startup work.
- Added device-hint performance profiles for conservative analysis concurrency, preview FPS and export quality guidance.
- Added reduced-motion accessibility styling and mobile-friendly Creator SEO controls.
## NEXUS identity and app icon
- Added a shared NEXUS symbol, wordmark, favicon, PWA icon and maskable artwork.
- Android CI generates adaptive launcher icon resources and updates the generated manifest after Capacitor creates the native project.
- This is the first implementation of the visual direction; final brand approval remains a release review item.
## Build 13A — Product identity and Google SEO
- Added page title/description, canonical, Open Graph/Twitter metadata, SoftwareApplication JSON-LD, robots.txt and a public-entry sitemap.
- Private/API routes are excluded from crawling. Google Search Console verification, submission and indexing require external domain access and are not claimed complete.
## Build 13B — Creator SEO
- Added editable platform-aware titles, descriptions, keywords, hashtags, timestamped chapter candidates, thumbnail text and alt text.
- Integrated the generator into NEXUS AI. Suggestions use only project name, brief and supplied transcript; no ranking promises.
## Build 14 — Integration and release gates
- CI verifies metadata and brand assets, runs regression tests and performs production type-check/build.
- Android CI generates the app icon and builds a debug APK.
- Remaining release checks: successful Actions runs, real-device Android testing, full video/audio review, final logo approval and Google Search Console confirmation.
- No Vercel deployment was triggered.
