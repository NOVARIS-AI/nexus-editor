# NEXUS Living Templates — Product and Implementation Specification

Status: approved product direction; implementation pending.
Scope: add a real "Use Template" workflow to the existing NEXUS Editor and introduce Living Templates as a signature feature. This is not a claim that the UI or matching engine is already implemented.

## 1. Existing behavior and gap

The current Templates page lists creative templates. Selecting a card immediately calls `applyCreativeTemplate`, which adds editable title, subtitle and footer layers, applies the template ratio and styling, and applies a look/transition defaults to existing visual clips. It does not provide a template detail/preview step, a dedicated "Use Template" action, intelligent media-slot matching, or a clear missing-media report.

## 2. Required "Use Template" experience

1. Template cards open a detail/preview sheet instead of applying immediately.
2. The sheet shows the template name, category, aspect ratio, duration, visual style, editable text placeholders, and a simple scene/slot breakdown.
3. Primary action: **Use Template**. Secondary action: **Preview** / close.
4. On use, create a new template-based project (or ask before replacing a non-empty project); never silently overwrite the user's current edit.
5. Keep all generated title/subtitle/footer layers, clips, transitions, filters and timing editable in the normal timeline.
6. Let the user choose existing media or import new photos/videos. Preserve original source files and never destructively alter them.
7. Confirm the project opened and show the user which slots were filled and which still need media.

## 3. Signature feature: NEXUS Living Templates

Living Templates are adaptive editing blueprints, not fixed video presets. They adapt a template's scene plan to the media the creator actually has.

### Core flow
- Each template defines ordered scene slots with a purpose (hook, establishing shot, detail, action, proof/result, closing), preferred media kind, suggested duration range, optional text role, and transition/look hints.
- The local scene-matching engine ranks the creator's imported assets against slot intent using available metadata and visual analysis. It must not pretend to understand content when analysis is unavailable.
- Show each suggested match with a reason and confidence label (for example: "close match", "possible match", "needs your choice"). Never silently publish or permanently assign low-confidence matches.
- Adapt slot duration and overall sequence to the available assets and the template's target length. Preserve sensible minimum/maximum durations and do not stretch short media beyond its real duration without an explicit freeze/loop choice.
- If no suitable asset exists, keep a clearly marked placeholder and offer an import/search action. Do not insert unrelated stock media automatically.
- Provide **Why this match?**, **Swap**, **Keep empty**, and **Re-run matching** controls.
- Include a "Fit to my media" action and a "Keep original template timing" alternative.
- Once accepted, build a normal editable timeline project. The adaptive plan is a starting point, not a locked edit.

### Distinctive differentiator: Story Gap Radar
Before the timeline is committed, NEXUS checks the story sequence for missing narrative beats, not just missing files. It can say, for example, "You have an opening and product close-up, but no clear result/demo shot." It should suggest a practical next capture or import, and offer an optional text-only fallback scene. It must distinguish a missing story beat from a missing media file and must not claim visual facts unsupported by the asset analysis.

## 4. Template schema direction

Extend the template model without breaking current templates. Add optional fields:
- `description`
- `sceneSlots[]`: stable id, role, label, preferred kinds, intent/search hints, min/max seconds, optional text role, optional transition/look hints
- `targetDurationRange`
- `storyArc`
- `thumbnail` (optional local asset key; do not hardcode remote URLs)

Existing templates without `sceneSlots` should receive a safe generated outline based on their category and duration. Keep backward compatibility with the current `CREATIVE_TEMPLATES` records.

## 5. Safety, privacy and reliability

- Media matching runs locally where supported; explain when analysis is skipped or falls back to filenames/metadata.
- Do not upload private media to an AI provider just to match a template.
- Never claim a feature has detected a scene, object, person, emotion, or quality unless an actual supported analysis returned that evidence.
- All suggested matches remain user-editable and reversible.
- A failed match must not damage the current project or imported media.
- Keep guest/local use available; social publishing and account actions remain subject to authentication.
- Avoid paid APIs and new provider dependencies unless the user explicitly approves them.

## 6. Acceptance criteria

- Tapping a template opens its preview/details; it does not instantly modify the current project.
- The user can choose **Use Template** and receives a new editable project.
- Existing media can be mapped into scene slots with visible confidence/reasons, or explicitly left empty.
- Story Gap Radar identifies only unsupported/missing beats and provides actionable suggestions.
- Users can swap, clear, re-run and manually edit all assignments.
- Current template application, editing, save/recovery and export behavior remain intact.
- Mobile layout works on small Android screens; no giant modal or long cramped page.
- TypeScript build, automated tests and manual Android browser/device checks pass before calling the feature complete.

## 7. Delivery sequence

A. Template detail/preview and explicit Use Template action.
B. Safe new-project creation and template schema migration.
C. Local media-to-slot matching with transparent confidence/reasons.
D. Story Gap Radar and user correction controls.
E. Regression, mobile performance and export testing.

No deployment is authorized by this specification.
