import aiDirector from "../../api/ai-director.js";
import cloudflareAI from "../../api/cloudflare-ai.js";
import creatorPage from "../../api/creator-page.js";
import engineJobs from "../../api/engine-jobs.js";
import engineStatus from "../../api/engine-status.js";
import nexusWorker from "../../api/nexus-worker.js";
import sitemap from "../../api/sitemap.js";
import transcribe from "../../api/transcribe.js";
import moderationAction from "../../api/moderation/action.js";
import moderationAppealAction from "../../api/moderation/appeal-action.js";
import moderationAppeals from "../../api/moderation/appeals.js";
import moderationEnforce from "../../api/moderation/enforce.js";
import moderationPendingPosts from "../../api/moderation/pending-posts.js";
import moderationPreviewToken from "../../api/moderation/preview-token.js";
import moderationPublishReview from "../../api/moderation/publish-review.js";
import moderationQueue from "../../api/moderation/queue.js";
import moderationSubmitAppeal from "../../api/moderation/submit-appeal.js";
import socialPlaybackToken from "../../api/social/playback-token.js";
import socialUploadIntent from "../../api/social/upload-intent.js";
import socialUploadStatus from "../../api/social/upload-status.js";

const routes = new Map([
  ["/api/ai-director", aiDirector],
  ["/api/cloudflare-ai", cloudflareAI],
  ["/api/creator-page", creatorPage],
  ["/api/engine-jobs", engineJobs],
  ["/api/engine-status", engineStatus],
  ["/api/nexus-worker", nexusWorker],
  ["/api/sitemap", sitemap],
  ["/api/transcribe", transcribe],
  ["/api/moderation/action", moderationAction],
  ["/api/moderation/appeal-action", moderationAppealAction],
  ["/api/moderation/appeals", moderationAppeals],
  ["/api/moderation/enforce", moderationEnforce],
  ["/api/moderation/pending-posts", moderationPendingPosts],
  ["/api/moderation/preview-token", moderationPreviewToken],
  ["/api/moderation/publish-review", moderationPublishReview],
  ["/api/moderation/queue", moderationQueue],
  ["/api/moderation/submit-appeal", moderationSubmitAppeal],
  ["/api/social/playback-token", socialPlaybackToken],
  ["/api/social/upload-intent", socialUploadIntent],
  ["/api/social/upload-status", socialUploadStatus],
]);

function makeRequest(request, url, overrides = {}) {
  const headers = Object.create(null);
  request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
  const query = Object.fromEntries(url.searchParams.entries());
  const req = {
    method: request.method,
    url: request.url,
    headers,
    query: { ...query, ...(overrides.query || {}) },
    body: overrides.body,
    async *[Symbol.asyncIterator]() {
      if (!request.body) return;
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
  return req;
}

function makeResponse() {
  let statusCode = 200;
  let finished = false;
  let body = null;
  const headers = new Headers();
  const res = {
    status(code) { statusCode = Number(code) || 200; return this; },
    setHeader(name, value) { headers.set(String(name), String(value)); return this; },
    getHeader(name) { return headers.get(String(name)); },
    json(value) {
      if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
      body = JSON.stringify(value);
      finished = true;
      return this;
    },
    send(value) { body = typeof value === "string" ? value : JSON.stringify(value); finished = true; return this; },
    end(value) { body = value == null ? null : String(value); finished = true; return this; },
    get finished() { return finished; },
    toResponse() {
      if (!finished) { body = null; statusCode = statusCode === 200 ? 204 : statusCode; }
      return new Response(body, { status: statusCode, headers });
    },
  };
  return res;
}

async function invoke(handler, request, url, overrides = {}) {
  const req = makeRequest(request, url, overrides);
  if (overrides.rawBody !== true && request.body && (request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    try { req.body = await request.clone().json(); }
    catch { return Response.json({ error: "Send a valid JSON body." }, { status: 400, headers: { "cache-control": "no-store" } }); }
  }
  const res = makeResponse();
  try {
    await handler(req, res);
    return res.toResponse();
  } catch (error) {
    return Response.json({ error: "The NEXUS service could not complete this request." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.split("/").filter(Boolean).length ? "/" + url.pathname.split("/").filter(Boolean).join("/") : "/";
    let handler = routes.get(pathname);
    let overrides = {};

    if (pathname === "/sitemap.xml") handler = sitemap;
    if (pathname === "/creator" || pathname.startsWith("/creator/")) {
      const creatorParts = pathname.split("/").filter(Boolean);
      const match = creatorParts.length === 2 ? [pathname, creatorParts[1], undefined] : creatorParts.length === 4 && creatorParts[2] === "post" ? [pathname, creatorParts[1], creatorParts[3]] : null;
      if (match) {
        handler = creatorPage;
        overrides.query = { username: decodeURIComponent(match[1]), ...(match[2] ? { postId: decodeURIComponent(match[2]) } : {}) };
      }
    }

    if (handler) return invoke(handler, request, url, { ...overrides, rawBody: pathname === "/api/transcribe" });
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
