# NEXUS Pulse — Feed Ranking

Updated: 2026-11-05

NEXUS Pulse is the first in-house recommendation/ranking layer for the Community feed. It is deterministic, lightweight, and runs in the client. It does not require a paid recommendation API or collect watch-time telemetry.

## Signals used

1. **Explicit interests:** categories inferred from posts the signed-in user liked or saved. Saves carry a stronger signal than likes.
2. **Creator choices:** followed creators receive a modest relevance boost in For You; Following remains a separate relationship-based feed.
3. **Freshness:** newer posts receive a decaying recency score.
4. **Community response:** likes and visible comments contribute a capped, logarithmic score so popularity cannot dominate ranking.
5. **Exploration:** a small stable per-post variation helps prevent every account seeing an identical order.
6. **Diversity:** a final re-ranking pass avoids consecutive posts from the same creator and category where possible.
7. **User controls:** Not interested removes a post from the current device session; Hide creator removes that creator from the current device session. Category choices on Discover become explicit interest signals for the current session.

## What it intentionally avoids

- No watch-time maximization, endless-scroll optimization, or inferred emotional vulnerability.
- No sensitive personal attributes or cross-site tracking.
- No paid ranking or undisclosed sponsored placement.
- Popularity is capped and is only one of several signals.

## Current limitations

- The candidate pool is limited to the latest 30 eligible posts returned by Supabase.
- Category detection is keyword-based until creators can attach structured topics/tags during publishing.
- Likes/saves/follows are currently used as available explicit preference signals; a full event/feedback history is not collected.
- Not interested, Hide creator, and category preference signals currently live only in page state and reset when the page is reloaded.
- Ranking currently runs in the browser, not a trusted server-side recommendation service. Database RLS still controls which posts can be read.
- Demo cards remain sample content and are not treated as actual community posts when Supabase has no live posts.

## Verification

The algorithm and UI integration have been committed to GitHub. No local build, typecheck, browser test, or live Supabase ranking test has been run. No deployment was performed.
