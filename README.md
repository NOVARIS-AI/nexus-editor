# VELTRONIX NEXUS Studio

NEXUS is a mobile-first creative workspace for video editing, AI-assisted production, graphics, audio, creator publishing and interactive game prototypes.

## Runtime architecture

- Application hosting: Cloudflare Workers + Workers Assets (cloudflare/nexus-app).
- AI text and image: native Cloudflare Workers AI binding on the application Worker.
- Identity and creator data: Supabase Auth + Postgres with Row Level Security.
- Optional video delivery: Cloudflare Stream; publishing remains gated until Stream credentials, webhook verification and moderation configuration are ready.
- Editing: React + TypeScript + Vite, shared browser timeline compositor, Web Audio, Canvas/SVG and optional native Android media operations.
- Android: Capacitor shell and GitHub Actions debug APK workflow.

GitHub is the source of truth. Do not deploy this application to Vercel.

## Implemented workspace capabilities

- Video, audio and image import, preview and editable timeline projects.
- Multi-track clip arrangement, trim, split, move, text/image overlays, transitions, filters, keyframes and supported audio mixing.
- AI Director, prompt understanding, Creative Fabric planning, scene workflows and local visual-analysis model support on compatible WebGPU devices.
- Browser-based project rendering and export where browser codec/memory support allows.
- Creative library with looks, effects, templates, stickers and transitions.
- Creator discovery/feed UI, profiles, interaction services, moderation and publishing foundations backed by Supabase migrations.
- NEXUS Game Studio starter: prompt-guided platformer/runner/top-down prototypes, live preview, touch/keyboard controls, local draft saving and standalone HTML export.
- Responsive web/PWA shell and Capacitor Android packaging.

## Known production boundaries

- Cloudflare Workers AI text/image requests use the app Worker AI binding. Actual model availability and account quota are verified only after deployment and a live request.
- Prompt-to-video generation needs a configured NEXUS video worker. Workers AI image generation is not represented as video generation.
- Premium voice/music/stem-separation providers need their own server-side credentials and deployed audio Worker. Local Web Audio and licensed-source fallbacks remain available where implemented.
- Live public video publishing needs the Supabase migrations applied, Cloudflare Stream configured, signed upload/webhook handling, and moderation checks. Sample feed cards remain previews when no live posts are available.
- Browser export uses a real-time Canvas/MediaRecorder path and is codec-, duration- and memory-dependent. A deterministic WebCodecs muxer is not yet the default.
- Android native background operations cover selected source-media tasks; they are not a full native multi-track project renderer. Physical-device QA remains required.
- Advanced 3D/WebGPU, full professional game-engine authoring, and full prompt-to-finished-game generation are not claimed as complete.

## Development

Node.js 22 is used in CI.

    npm install
    npm run dev
    npm test
    npm run build

## Cloudflare deployment

The canonical app Worker configuration is cloudflare/nexus-app/wrangler.toml.

The GitHub Actions workflow .github/workflows/cloudflare-nexus-deploy.yml builds and deploys the app when changes reach main, or by manual workflow dispatch.

Required GitHub Actions secrets:
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN

The Cloudflare token must have permission to deploy Workers and manage Worker assets. The app's Workers AI binding is declared in Wrangler; it does not require a browser-exposed API token.

Optional server-side integrations:
- SUPABASE_SERVICE_ROLE_KEY (never expose to Vite/browser)
- CLOUDFLARE_STREAM_TOKEN and CLOUDFLARE_STREAM_CUSTOMER_CODE
- GROQ_API_KEY
- Dedicated NEXUS image/video/audio/render worker URLs and tokens
- Audio-provider keys documented in docs/audio-provider-setup.md

Browser build variables (public values only):
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY)

Never put service-role keys, Cloudflare API tokens, provider secrets or webhook secrets in VITE_* variables or committed files.

## Android APK

See docs/ANDROID_APK.md. The GitHub Actions workflow creates a debug APK artifact for testing. A debug APK is not a Play Store release-signed build.

## Release discipline

1. Keep changes on a feature branch and run CI.
2. Review the complete PR and confirm required integrations/secrets.
3. Merge only after tests, type-check and production build pass.
4. Deploy through the Cloudflare workflow only.
5. Verify the deployed Worker health endpoint and test AI, auth, editor import/export and Android workflows on real devices.