# NEXUS Moderation Centre
A restricted staff-only report queue with server-side authorization and an audit trail.

## Security model
- Browser clients never read the reports queue or write moderation events directly.
- Every API request validates the Supabase access token, then checks the user's row in `moderator_roles` using the server-only service role key.
- `moderator_roles`, `reports`, and `moderation_events` have RLS enabled and no client read/write policy. Report submission remains allowed through the existing reporter-owned insert policy.
- Never place `SUPABASE_SERVICE_ROLE_KEY` in VITE variables, browser code, or the repository.

## One-time owner setup
1. Apply `supabase/migrations/202611050008_moderator_roles.sql` in the NEXUS Supabase SQL Editor.
2. Sign in to NEXUS once, then run this query to see your account UUID:
   `select id, email from auth.users where email = 'YOUR_SIGN_IN_EMAIL';`
3. Assign only trusted adult moderators. To grant the project owner account:
   `insert into public.moderator_roles(user_id, role) values ('YOUR_AUTH_USER_UUID', 'admin') on conflict (user_id) do update set role = excluded.role;`
4. Configure server-only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the hosting environment. The service key must never use a `VITE_` prefix.
5. Reload the app and open Moderation Centre. Until the migration, role assignment, and server variables are in place, access fails closed.

## Current scope
Queue filters and audited report triage (reviewing/actioned/dismissed). This first slice does not automatically remove content, suspend accounts, or resolve appeals. Human review is required; use a separate documented process for urgent safety reports. Build, typecheck, integration tests, and Android testing are still required.


## Atomic moderation action hardening

Migration `supabase/migrations/202611060002_atomic_moderation_actions.sql` adds two trusted, service-role-only database RPCs. Report decisions now lock the report row and apply the content restriction, report status and audit event in one transaction. Appeal decisions similarly lock the appeal and atomically restore content when reversed, update the appeal, and write the audit event. The API no longer performs these changes as separate REST requests, preventing partially applied decisions and concurrent double-review. Apply this migration in the dedicated NEXUS Supabase project before using the updated moderation actions. The migration does not change public navigation or grant moderator permissions to any account.
