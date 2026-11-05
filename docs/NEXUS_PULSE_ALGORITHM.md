# NEXUS Pulse — Recommendation Algorithm

Updated: 2026-11-05

NEXUS Pulse is the in-house ranking and discovery layer for the Community feed. Version 2.0 adds persistent user controls, historical explicit-interest signals, creator-topic matching, and a larger candidate pool.

## Ranking signals

1. **Explicit preferences:** categories the viewer chooses in Discover.
2. **Historical interests:** categories inferred from up to 200 recent likes and 200 recent saves. Saves carry a stronger signal than likes.
3. **Creator-topic matching:** each creator can select up to 12 topics on their own profile. Post topics and creator topics are matched against viewer interests.
4. **Creator relationships:** followed creators receive a modest relevance boost in For You; Following remains relationship-based.
5. **Freshness:** newer posts receive a decaying recency score.
6. **Community response:** likes and visible comments contribute a capped logarithmic score so popularity cannot dominate.
7. **Exploration:** a small stable variation helps surface content beyond a viewer's strongest interests, with more exploration for new/cold-start viewers.
8. **Diversity:** a final pass avoids consecutive posts from the same creator and category where possible.
9. **Feedback controls:** Not interested and Hide creator are stored in the viewer's private preferences.

## Persistent data

Migration `202611050003_nexus_pulse_v2.sql` adds:
- `posts.topics`: creator-selected topics for each post.
- `profiles.creator_topics`: creator-level topic declarations.
- `feed_preferences`: private preferred categories, hidden post IDs, and hidden creator IDs, protected by per-user RLS.

The profile sheet lets a creator edit their own topics. Discover category choices can be toggled to train or remove a preference. Feedback choices persist for signed-in users; guest preferences remain session-only.

## Safety and privacy choices

- No watch-time tracking or attention-maximization objective.
- No sensitive personal attributes, cross-site tracking, or inferred emotional vulnerability.
- No paid ranking or undisclosed sponsored placement.
- Popularity is capped and is only one signal.
- Feed preference rows are visible only to their owner under RLS.

## Current limits

- The feed ranks up to 100 eligible posts fetched from Supabase; cursor pagination and a server-side ranking service are future work.
- Category inference is lightweight keyword matching, not a trained classifier.
- Historical taste is inferred from recent likes and saves only; comments are not mined for interests.
- Creator topics are self-declared and should be reviewed for quality/spam once publishing and moderation tools are active.
- The recommendation calculation currently runs in the browser. RLS remains the authority for post visibility.
- No real media playback or publishing pipeline is included in this algorithm upgrade.

## Verification status

Source changes and migration are committed to GitHub. The new migration must be run in the dedicated NEXUS Supabase project's SQL Editor before the persistent features work. A local build, typecheck, browser test, and live database test have not been run. No deployment was performed.
