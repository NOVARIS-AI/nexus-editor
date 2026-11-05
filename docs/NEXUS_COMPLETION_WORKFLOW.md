# NEXUS Editor — Completion Workflow Additions

This document extends the existing Builds 1–14 roadmap. It does not replace or restart completed work. Continue from the current main branch, preserve existing editor capabilities, and keep GitHub implementation/testing ahead of any release deployment.

## Workstream A — Google SEO

SEO has two connected tracks: NEXUS product website/app discovery and the creator-publishing workflow inside the editor.

### A1. NEXUS website and app discovery
- Give every public, indexable product page a unique, accurate page title and meta description.
- Add canonical URLs, Open Graph and social-share metadata, descriptive headings and accessible image alternative text.
- Generate and validate sitemap.xml and robots.txt; prevent private editor routes, account pages and project content from being indexed.
- Add appropriate JSON-LD structured data only where it truthfully describes visible page content. Do not invent ratings, reviews, prices or business details.
- Audit mobile usability, page speed/Core Web Vitals, crawlability, broken links, redirects and duplicate content.
- Prepare Google Search Console verification and sitemap submission as a release task. Verification requires access to the real domain/property; source code alone cannot prove ownership or indexing.
- Add privacy-conscious analytics only if a suitable free option is available and the project owner explicitly configures it. No paid SEO service or API is required for the baseline.

### A2. Creator SEO inside NEXUS Editor
- Add an SEO workspace to the existing AI Director/export flow, not a disconnected app.
- Generate editable, platform-aware titles, descriptions, topic/keyword suggestions, chapter/timestamp suggestions, captions/transcript cleanup, thumbnail text guidance and accessibility alt text from the actual project brief and media evidence.
- Separate search intent from audience language; avoid keyword stuffing, misleading titles, unsupported claims and guaranteed-ranking promises.
- Allow creators to choose a target platform/search destination and review every suggestion before copying/exporting.
- Keep SEO metadata attached to the project/export package where supported; never silently publish content or change a user's public account.
- Provide a transparent checklist and explain that Google ranking/indexing depends on many external factors and cannot be guaranteed.

### Acceptance checks
- Public pages have unique metadata, valid canonical links, crawl-safe private routes and valid sitemap/robots files.
- Structured data validates and matches visible page content.
- SEO suggestions cite the project inputs they are based on, remain editable and can be rejected.
- No keyword stuffing, invented facts or ranking guarantees.
- Search Console verification/indexing is reported as pending until confirmed in the actual property.

## Workstream B — Official NEXUS app logo and icon

Create one approved brand mark and derive all platform assets from the same master artwork.

### B1. Brand asset design
- Design a distinctive NEXUS mark aligned with the VELTRONIX NEXUS identity: futuristic, premium, clear at very small sizes.
- Produce a symbol-only app icon and a wordmark/lockup for places where the full name fits.
- Ensure the symbol remains recognisable in monochrome, light/dark backgrounds and Android adaptive-icon masks.
- Avoid tiny lettering, thin details, copied third-party marks and unlicensed visual assets.
- Keep the source artwork editable (SVG/vector) and record its colours, clear space and minimum-size rules.

### B2. Platform integration
- Browser favicon and touch icon.
- PWA manifest icons at required sizes, including maskable artwork.
- Android launcher icon foreground/background and adaptive icon resources at appropriate densities.
- Android splash/launch branding where supported.
- In-app navigation/header identity and install surfaces, without disrupting the editor layout.
- Ensure the same approved logo is used across web and Android builds; no mismatched placeholder icon remains.

### Acceptance checks
- Icon is legible at small launcher and browser sizes.
- Adaptive icon is not clipped by common Android masks.
- Favicon, PWA, Android launcher and in-app mark all derive from the same approved source.
- Build verifies all referenced assets exist and Android resource generation succeeds.
- Confirm final visual approval before release; do not silently invent a final logo direction if the user has not approved it.

## Where these fit in the existing roadmap

1. Builds 1–9: retain their current implementation and verification state.
2. Build 10 — AI Editing Execution Engine.
3. Build 11 — Quality Intelligence and Final Review.
4. Build 12 — Export and Production Reliability.
5. Build 13 — Mobile Experience and Performance; include app-icon integration and platform asset verification here.
6. Build 13A — Product Identity and Google SEO; implement public-site technical SEO and the approved icon/brand system.
7. Build 13B — Creator SEO; integrate editable SEO planning into AI Director and export workflows.
8. Build 14 — Final Integration, Testing and Release; run SEO crawl/metadata checks and web/PWA/Android icon checks as release gates.

## Working rules
- GitHub first; no Vercel deployment during normal implementation.
- Do not remove or replace existing editor features to make room for SEO or branding.
- Keep baseline SEO implementation free; do not add paid APIs or services without explicit approval.
- Google Search Console verification, indexing and rankings are external outcomes and must not be reported as complete without evidence.
- The app icon must be visually reviewed and approved before final release.

## Workstream C — Public For You creator platform (hybrid)

The public creator community is an additive product workstream, not a replacement for Studio. Guests can browse public videos; authentication is required for publishing and social interactions. The approved architecture separates application identity/data, trusted API orchestration and dedicated video delivery.

See [SOCIAL_PLATFORM_HYBRID_ARCHITECTURE.md](./SOCIAL_PLATFORM_HYBRID_ARCHITECTURE.md) for the repository audit, proposed data model, upload lifecycle, feed/playback design, authentication, moderation, privacy, cost guardrails, phased implementation and acceptance criteria.

Sequence this after the current editor foundations are preserved:
1. Confirm Supabase and Cloudflare Stream account readiness and current quotas.
2. Implement identity, database migrations and RLS.
3. Implement profiles and social primitives.
4. Implement secure video upload/webhooks and publish-from-Studio handoff.
5. Implement guest-accessible For You feed and adaptive playback.
6. Complete moderation, privacy, rights and abuse controls before enabling public uploads.
7. Add recommendations/analytics only after feed reliability and privacy checks.
8. Run web/Android integration, security, load and cost tests before an explicitly approved release.

This workstream is planned, not yet implemented. Do not mark it complete based on the architecture document alone.


## Workstream D — Use Template and NEXUS Living Templates

The current template cards apply a basic title/look treatment immediately. Upgrade this into a deliberate template-to-project flow with a preview, a clear **Use Template** action, and a safe new-project handoff.

The signature differentiator is **NEXUS Living Templates**: adapt scene slots and timing to the creator's available media, show match confidence and reasons, and let the creator accept, swap or leave slots empty. Add **Story Gap Radar** to identify missing narrative beats and suggest what to capture or import, without inventing visual analysis.

See [LIVING_TEMPLATES_SPEC.md](./LIVING_TEMPLATES_SPEC.md) for the detailed behavior, data model direction, privacy constraints, acceptance criteria and implementation sequence.

This workstream is product-specified, not implemented. Do not mark Use Template or Living Templates complete until the UI, matching engine, correction controls, tests and mobile checks pass.


## Workstream E — For You community frontend and publish handoff

The first provider-independent frontend slice is committed: navigation, sample preview feed, discovery/search, local interaction previews, creator/profile sheets, gated sign-in handoff, and the Studio publish-preparation wizard.

See [FORYOU_FRONTEND_IMPLEMENTATION.md](./FORYOU_FRONTEND_IMPLEMENTATION.md) for the exact implemented scope, explicit non-live limitations, and remaining production requirements.

This is a frontend preview, not a live social network. Keep sample-content labels and publish-unavailable messaging until the dedicated NEXUS Supabase project, video provider, RLS, upload pipeline, moderation and end-to-end checks are complete.
