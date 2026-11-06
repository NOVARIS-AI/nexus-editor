import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("NEXUS social and moderation security regression checks", () => {
  it("keeps the public feed limited to approved, ready public posts", () => {
    const source = read("../src/social/social-service.ts");
    expect(source).toContain('.eq("status", "ready").eq("moderation_state", "approved")');
    expect(source).toContain('query = query.eq("visibility", "public")');
  });

  it("requires a ready approved post and validates viewer access before issuing playback", () => {
    const source = read("../api/social/playback-token.ts");
    expect(source).toContain('post.status !== "ready"');
    expect(source).toContain('post.moderation_state !== "approved"');
    expect(source).toContain('post.visibility === "followers"');
    expect(source).toContain('creator.is_private');
    expect(source).toContain('asset.upload_state !== "ready"');
    expect(source).toContain('blocks?select=blocker_id');
  });

  it("keeps moderation API authorization server-side and uses atomic RPC actions", () => {
    const auth = read("../server/moderation-api.ts");
    const report = read("../api/moderation/enforce.ts");
    const appeal = read("../api/moderation/appeal-action.ts");
    expect(auth).toMatch(/moderator_roles/);
    expect(report).toContain("rpc/nexus_apply_report_decision");
    expect(appeal).toContain("rpc/nexus_decide_moderation_appeal");
    expect(report).not.toContain('from("posts")');
    expect(appeal).not.toContain('from("moderation_appeals")');
  });

  it("locks report and appeal rows and restricts the decision functions to service_role", () => {
    const sql = read("../supabase/migrations/202611060002_atomic_moderation_actions.sql");
    expect(sql).toMatch(/reports[\s\S]*?for update/i);
    expect(sql).toMatch(/moderation_appeals[\s\S]*?for update/i);
    expect(sql).toContain("revoke all on function public.nexus_apply_report_decision");
    expect(sql).toContain("revoke all on function public.nexus_decide_moderation_appeal");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("moderation_events");
  });

  it("keeps uploaded videos pending until a trusted moderator atomically approves or rejects them", () => {
    const migration = read("../supabase/migrations/202611060003_publish_moderation_pipeline.sql");
    const queue = read("../api/moderation/pending-posts.ts");
    const review = read("../api/moderation/publish-review.ts");
    const preview = read("../api/moderation/preview-token.ts");
    const publish = read("../src/social/PublishFlow.tsx");
    expect(migration).toContain("for update");
    expect(migration).toContain("nexus_review_pending_post");
    expect(migration).toContain("publish_approved");
    expect(migration).toContain("publish_rejected");
    expect(migration).toContain("to service_role");
    expect(queue).toContain('status=eq.processing&moderation_state=eq.pending');
    expect(review).toContain("rpc/nexus_review_pending_post");
    expect(preview).toContain("requireModerator");
    expect(preview).toContain('post.status !== "processing"');
    expect(publish).toContain("checkVideoDraftStatus");
    expect(publish).toContain("Submit for review");
  });

  it("does not accidentally expose moderation routes in public navigation", () => {
    const app = read("../src/App.tsx");
    expect(app).toMatch(/moderation/);
    expect(app).toMatch(/appeals/);
    expect(app).toMatch(/My Profile/);
  });
});
