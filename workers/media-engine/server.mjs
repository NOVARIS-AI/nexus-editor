import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(ROOT, "data");
const JOBS = path.join(DATA, "jobs");
const OUTPUTS = path.join(DATA, "outputs");
const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.NEXUS_ENGINE_WORKER_TOKEN || "";
const OUTPUT_SECRET = process.env.NEXUS_ENGINE_OUTPUT_SECRET || TOKEN;
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const SOURCE_HOSTS = new Set((process.env.NEXUS_MEDIA_SOURCE_HOSTS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean));
const YTDLP_HOSTS = new Set((process.env.NEXUS_YTDLP_ALLOWED_HOSTS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean));
const MAX_BODY = 24 * 1024;
const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
const jobs = new Map();
let remotionBundle;

await fs.mkdir(JOBS, { recursive: true });
await fs.mkdir(OUTPUTS, { recursive: true });

const json = (res, status, value) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
};
const safeId = value => /^[a-f0-9-]{36}$/i.test(String(value || ""));
const authOK = req => {
  if (!TOKEN) return false;
  const value = String(req.headers.authorization || "");
  const supplied = value.startsWith("Bearer ") ? value.slice(7) : "";
  const a = Buffer.from(supplied), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
async function readJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function signOutput(name, expires) {
  return crypto.createHmac("sha256", OUTPUT_SECRET).update(name + ":" + expires).digest("hex");
}
function outputUrl(name) {
  if (!PUBLIC_BASE_URL || !OUTPUT_SECRET) throw new Error("PUBLIC_BASE_URL and NEXUS_ENGINE_OUTPUT_SECRET must be configured.");
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return PUBLIC_BASE_URL + "/outputs/" + encodeURIComponent(name) + "?expires=" + expires + "&sig=" + signOutput(name, expires);
}
async function saveJob(job) {
  jobs.set(job.id, job);
  await fs.writeFile(path.join(JOBS, job.id + ".json"), JSON.stringify(job));
}
async function getJob(id) {
  if (jobs.has(id)) return jobs.get(id);
  try {
    const job = JSON.parse(await fs.readFile(path.join(JOBS, id + ".json"), "utf8"));
    jobs.set(id, job);
    return job;
  } catch { return null; }
}
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: { ...process.env, ...options.env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", data => { stdout = (stdout + data.toString()).slice(-12000); });
    child.stderr.on("data", data => { stderr = (stderr + data.toString()).slice(-12000); });
    const timer = setTimeout(() => child.kill("SIGKILL"), options.timeout || 15 * 60 * 1000);
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || command + " failed").slice(-3000)));
    });
  });
}
function checkedUrl(value, allowedHosts) {
  let url;
  try { url = new URL(value); } catch { throw new Error("A valid media URL is required."); }
  if (url.protocol !== "https:" || url.username || url.password || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error("This source URL is not on the server's HTTPS media-host allowlist.");
  }
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.)/i.test(url.hostname)) {
    throw new Error("Private and local network addresses are not permitted.");
  }
  return url;
}
async function downloadAllowedMedia(urlValue, folder) {
  const url = checkedUrl(urlValue, SOURCE_HOSTS);
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(45000) });
  if (!response.ok || !response.body) throw new Error("Could not retrieve the approved media source.");
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_MEDIA_BYTES) throw new Error("Media source exceeds the 200 MB processing limit.");
  const file = path.join(folder, "input-media");
  const handle = await fs.open(file, "w");
  let total = 0;
  try {
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > MAX_MEDIA_BYTES) throw new Error("Media source exceeded the 200 MB processing limit.");
      await handle.write(chunk);
    }
  } finally { await handle.close(); }
  return file;
}
function mimeFor(engine, ext) {
  const value = ext.toLowerCase();
  if (value.endsWith(".mp4") || value.endsWith(".m4v")) return "video/mp4";
  if (value.endsWith(".webm")) return "video/webm";
  if (value.endsWith(".mov")) return "video/quicktime";
  if (value.endsWith(".mp3")) return "audio/mpeg";
  if (value.endsWith(".m4a")) return "audio/mp4";
  if (value.endsWith(".wav")) return "audio/wav";
  if (value.endsWith(".m4a")) return "audio/mp4";
  if (value.endsWith(".ogg")) return "audio/ogg";
  return engine === "ytdlp" ? "application/json" : "application/octet-stream";
}
async function runRemotion(job, folder, output) {
  const props = {
    title: String(job.options.title || job.options.sceneTitle || "NEXUS AI").slice(0, 90),
    prompt: job.prompt.slice(0, 1200),
    scenes: Array.isArray(job.options.scenes) ? job.options.scenes.slice(0, 12) : [],
    durationSeconds: Math.max(3, Math.min(180, Number(job.options.duration || 12))),
    aspectRatio: String(job.options.aspectRatio || "9:16")
  };
  remotionBundle ||= await bundle({ entryPoint: path.join(ROOT, "remotion", "entry.jsx") });
  await ensureBrowser();
  const composition = await selectComposition({ serveUrl: remotionBundle, id: "NexusDirector", inputProps: props, logLevel: "error" });
  await renderMedia({
    composition, serveUrl: remotionBundle, codec: "h264", outputLocation: output, inputProps: props,
    chromiumOptions: { enableMultiProcessOnLinux: true }, logLevel: "error"
  });
}
async function runHyperFrames(job, folder, output) {
  const title = String(job.options.title || job.options.sceneTitle || "NEXUS AI").replace(/[<>]/g, "").slice(0, 90);
  const description = job.prompt.replace(/[<>]/g, "").slice(0, 220);
  const seconds = Math.max(3, Math.min(60, Number(job.options.duration || 10)));
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><script src="./node_modules/gsap/dist/gsap.min.js"></script><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0a0b10;color:#fff;font-family:Arial,sans-serif}.scene{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;padding:9%;background:radial-gradient(circle at 75% 18%,#554267,#171a29 50%,#08090d)}.eyebrow{color:#f3d65b;letter-spacing:.3em;font-size:24px;text-transform:uppercase}.title{font-size:76px;font-weight:800;line-height:1.06;margin-top:24px;opacity:0}.description{font-size:30px;line-height:1.4;margin-top:28px;color:#ddd;opacity:0}.progress{position:absolute;bottom:6%;left:9%;height:4px;width:82%;background:#ffffff33}.bar{height:100%;width:0;background:#f3d65b}</style></head><body><div data-composition-id="nexus" data-width="1080" data-height="1920" data-duration="${seconds}" class="scene"><div class="eyebrow">NEXUS • AI DIRECTOR</div><div class="title">${title}</div><div class="description">${description}</div><div class="progress"><div class="bar"></div></div></div><script>const tl=gsap.timeline({paused:true});tl.to(".title",{opacity:1,y:0,duration:.9},.2).fromTo(".description",{opacity:0,y:24},{opacity:1,y:0,duration:1},.65).to(".bar",{width:"100%",duration:${seconds},ease:"none"},0);window.__timelines=window.__timelines||{};window.__timelines["nexus"]=tl;</script></body></html>`;
  await fs.writeFile(path.join(folder, "index.html"), html);
  await runProcess("npx", ["--no-install", "hyperframes", "render", "--output", output], { cwd: folder, timeout: 15 * 60 * 1000 });
}
async function runFfmpeg(job, folder, output) {
  if (!job.options.inputUrl) throw new Error("FFmpeg needs an approved inputUrl in the task options.");
  const input = await downloadAllowedMedia(job.options.inputUrl, folder);
  const action = String(job.options.action || "transcode").toLowerCase();
  const args = ["-y"];
  if (action === "trim") {
    const start = Math.max(0, Math.min(3600, Number(job.options.startSeconds) || 0));
    const duration = Math.max(.1, Math.min(600, Number(job.options.durationSeconds) || 10));
    args.push("-ss", String(start), "-i", input, "-t", String(duration), "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", output);
  } else {
    args.push("-i", input);
    if (action === "extract-audio") args.push("-vn", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output);
    else {
      const format = String(job.options.format || "mp4").toLowerCase();
      if (!["mp4", "webm", "mp3", "wav"].includes(format)) throw new Error("Unsupported FFmpeg output format.");
      if (format === "mp3") args.push("-vn", "-codec:a", "libmp3lame", "-q:a", "3", output);
      else if (format === "wav") args.push("-vn", "-c:a", "pcm_s16le", output);
      else if (format === "webm") args.push("-c:v", "libvpx-vp9", "-c:a", "libopus", output);
      else args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-movflags", "+faststart", output);
    }
  }
  await runProcess("ffmpeg", args, { cwd: folder, timeout: 15 * 60 * 1000 });
}
async function runYtDlp(job, folder, output) {
  const metadata = String(job.options.action || "metadata") === "metadata";
  if (!metadata && job.options.userAuthorized !== true) throw new Error("Media retrieval requires explicit confirmation that the user owns the media or has permission to download it.");
  const url = checkedUrl(job.options.url, YTDLP_HOSTS);
  const args = ["--no-warnings", "--no-playlist", "--no-call-home", "--no-write-comments", "--no-write-description", "--no-write-info-json"];
  if (metadata) args.push("--dump-single-json", "--skip-download", url.toString());
  else args.push("--max-filesize", "200M", "--format", "best[ext=mp4]/best", "--merge-output-format", "mp4", "--no-part", "-o", output, url.toString());
  const result = await runProcess("yt-dlp", args, { cwd: folder, timeout: 10 * 60 * 1000 });
  if (metadata) {
    const parsed = JSON.parse(result.stdout.trim().split("\\n").at(-1));
    return { title: String(parsed.title || "").slice(0, 300), duration: Number(parsed.duration) || null, webpage_url: url.origin + url.pathname, extractor: String(parsed.extractor_key || "").slice(0, 80) };
  }
}
async function execute(job) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-engine-"));
  const outputExt = job.engine === "ffmpeg" ? (String(job.options.action || "") === "extract-audio" ? "m4a" : String(job.options.format || "mp4") === "mp3" ? "mp3" : String(job.options.format || "mp4") === "wav" ? "wav" : String(job.options.format || "mp4") === "webm" ? "webm" : "mp4") : job.engine === "ytdlp" ? (String(job.options.action || "metadata") === "metadata" ? "json" : "mp4") : "mp4";
  const output = path.join(folder, "nexus-output." + outputExt);
  try {
    job.state = "running"; job.progress = 5; job.message = "Preparing internal media engine…"; await saveJob(job);
    if (job.engine === "remotion") await runRemotion(job, folder, output);
    else if (job.engine === "hyperframes") await runHyperFrames(job, folder, output);
    else if (job.engine === "ffmpeg") await runFfmpeg(job, folder, output);
    else if (job.engine === "ytdlp") {
      const result = await runYtDlp(job, folder, output);
      if (result && typeof result === "object") job.metadata = result;
    } else throw new Error("Unsupported internal engine.");
    if (job.engine !== "ytdlp" || String(job.options.action || "metadata") !== "metadata") {
      const finalName = job.id + "." + outputExt;
      await fs.copyFile(output, path.join(OUTPUTS, finalName));
      job.output = { url: outputUrl(finalName), mimeType: mimeFor(job.engine, finalName) };
    }
    job.state = "succeeded"; job.progress = 100; job.message = "Internal media task completed.";
    await saveJob(job);
  } catch (error) {
    job.state = "failed"; job.progress = 0; job.error = String(error?.message || "Internal engine failed").slice(0, 1000); job.message = "Internal media task failed.";
    await saveJob(job);
  } finally {
    await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
  }
}
function authorizedOutput(req, name, url) {
  const expires = Number(url.searchParams.get("expires"));
  const supplied = String(url.searchParams.get("sig") || "");
  if (!Number.isFinite(expires) || expires < Date.now() / 1000 || expires > Date.now() / 1000 + 60 * 60 * 24 + 60) return false;
  const expected = signOutput(name, expires);
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, service: "nexus-media-engine", engines: ["remotion", "hyperframes", "ffmpeg", "ytdlp"] });
  if (req.method === "GET" && url.pathname.startsWith("/outputs/")) {
    const name = path.basename(decodeURIComponent(url.pathname.slice("/outputs/".length)));
    if (!/^[a-f0-9-]{36}\.(mp4|webm|mp3|wav|json)$/i.test(name) || !authorizedOutput(req, name, url)) return json(res, 403, { error: "Output link is invalid or expired." });
    try {
      const file = path.join(OUTPUTS, name), stat = await fs.stat(file);
      res.writeHead(200, { "content-type": mimeFor("output", name), "content-length": stat.size, "cache-control": "private, max-age=300" });
      return createReadStream(file).pipe(res);
    } catch { return json(res, 404, { error: "Output not found." }); }
  }
  if (!authOK(req)) return json(res, 401, { error: "Invalid internal worker authorization." });
  if (req.method === "POST" && url.pathname === "/jobs") {
    try {
      const body = await readJson(req);
      const engine = String(body.engine || "");
      if (!["remotion", "hyperframes", "ffmpeg", "ytdlp"].includes(engine)) return json(res, 400, { error: "Unsupported media engine." });
      if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 12000) return json(res, 400, { error: "A prompt of up to 12,000 characters is required." });
      if (!body.options || typeof body.options !== "object" || Array.isArray(body.options) || JSON.stringify(body.options).length > 8000) return json(res, 400, { error: "Invalid engine options." });
      if (!PUBLIC_BASE_URL || !OUTPUT_SECRET) return json(res, 503, { error: "The media worker output URL is not configured." });
      const job = { id: crypto.randomUUID(), engine, state: "queued", progress: 0, message: "Queued for internal execution.", prompt: body.prompt.trim(), options: body.options, createdAt: new Date().toISOString() };
      await saveJob(job);
      setImmediate(() => { void execute(job); });
      return json(res, 202, { id: job.id, state: job.state, progress: 0, message: job.message });
    } catch (error) { return json(res, 400, { error: String(error?.message || "Invalid job request.").slice(0, 500) }); }
  }
  if (req.method === "GET" && url.pathname.startsWith("/jobs/")) {
    const id = decodeURIComponent(url.pathname.slice("/jobs/".length));
    if (!safeId(id)) return json(res, 400, { error: "Invalid job id." });
    const job = await getJob(id);
    if (!job) return json(res, 404, { error: "Job not found." });
    return json(res, 200, { id: job.id, state: job.state, progress: job.progress, message: job.message, ...(job.output ? { output: job.output } : {}), ...(job.metadata ? { metadata: job.metadata } : {}), ...(job.error ? { error: job.error } : {}) });
  }
  return json(res, 404, { error: "Route not found." });
});
server.listen(PORT, "0.0.0.0", () => process.stdout.write("NEXUS media engine listening on " + PORT + "\n"));
