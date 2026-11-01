import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Clapperboard,
  Cloud, Command, Compass, Film, Folder, FolderOpen, Grid2X2, HelpCircle,
  Home, Image as ImageIcon, Layers, Music2, Play, Plus, Search, Settings,
  SlidersHorizontal, Sparkles, Scissors, Trash2, Upload, WandSparkles, X,
  Volume2, Crop, Type, Captions, Sticker, ImagePlus, Gauge, Share2, CheckCircle2, RotateCcw, Palette, AudioLines
} from "lucide-react";
import type { MediaAsset, TimelineClip } from "./types";
import { searchWikimediaCommons, type SourcedMediaResult } from "./editor/media-sourcing";
import { analyzeMediaAsset, getRenderCapabilities, interpretEditorCommand, makeEditingGuidance, verifyProject, type MediaAnalysis } from "./editor/engines";
import { clipDuration, defaultTracks, downloadProject, makeProject, parseProject, timelineDuration } from "./project";

type Page = "home" | "editor" | "projects" | "templates" | "ai" | "settings";
const uid = () => crypto.randomUUID();
const themes = [
  { id: "violet", name: "Midnight Violet", colors: ["#a923ed", "#5d42ff", "#00bfe9"] },
  { id: "ocean", name: "Ocean Blue", colors: ["#168cff", "#2855e8", "#20d5e8"] },
  { id: "emerald", name: "Emerald Green", colors: ["#10b981", "#087f69", "#7ee6b7"] },
  { id: "sunset", name: "Sunset Orange", colors: ["#ff8a32", "#e34b38", "#ffc15c"] },
  { id: "rose", name: "Rose Pink", colors: ["#f04486", "#bd347d", "#ff9ab8"] },
  { id: "crimson", name: "Crimson Red", colors: ["#ef4444", "#b91c3c", "#ff8b73"] }
] as const;
const clock = (n: number) => {
  const m = Math.floor(n / 60), s = Math.floor(n % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [undoStack, setUndoStack] = useState<TimelineClip[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineClip[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [status, setStatus] = useState("Your creative space is ready");
  const [editorTool, setEditorTool] = useState("Media");
  const [editorView, setEditorView] = useState("workspace");
  const [activeTool, setActiveTool] = useState("edit");
  const [activeSubtool, setActiveSubtool] = useState("select");
  const [overlayText, setOverlayText] = useState("Your text");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState("Arial");
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [muteClip, setMuteClip] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [exportQuality, setExportQuality] = useState("1080p");
  const [exportFps, setExportFps] = useState("30 FPS");
  const [search, setSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [aiBrief, setAiBrief] = useState("");
  const [aiReply, setAiReply] = useState("I can guide the editor and run a few supported actions. Try “split this clip”, “mute clip”, “add text”, or “change ratio to 16:9”.");
  const [aiContextStatus, setAiContextStatus] = useState("Preparing editor context…");
  const [aiContextSummary, setAiContextSummary] = useState("");
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiStyle, setAiStyle] = useState("Cinematic");
  const [aiFormat, setAiFormat] = useState("9:16");
  const [aiMode, setAiMode] = useState("create");
  const [aiWorkspaceOpen, setAiWorkspaceOpen] = useState(false);
  const [aiWorkflowStage, setAiWorkflowStage] = useState<"idea" | "planning" | "review" | "editing">("idea");
  const [aiChatMessages, setAiChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([{ role: "assistant", text: "Welcome to NEXUS AI Studio. Tell me what you want to create. I’ll guide you through the idea, creative plan, visuals and approval before we open the editing workspace." }]);
  const [aiPlan, setAiPlan] = useState<null | { title: string; duration: number; scenes: { title: string; visual: string; narration: string; searchTerms: string[]; fallback: string }[]; sourcingNote: string }>(null);
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [mediaSearchResults, setMediaSearchResults] = useState<SourcedMediaResult[]>([]);
  const [mediaSearchStatus, setMediaSearchStatus] = useState("");
  const [mediaSearchBusy, setMediaSearchBusy] = useState(false);
  const [mediaAnalyses, setMediaAnalyses] = useState<MediaAnalysis[]>([]);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [engineReport, setEngineReport] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("nexus-editor-theme") || "violet");
  function changeTheme(id: string) { setTheme(id); localStorage.setItem("nexus-editor-theme", id); }
  const mediaInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const aiWorker = useRef<Worker | null>(null);
  useEffect(() => {
    try {
      const worker = new Worker(new URL("./editor/ai.worker.ts", import.meta.url), { type: "module" });
      aiWorker.current = worker;
      worker.onmessage = (event: MessageEvent<{ summary: string; toolCount: number; actionCount: number; capabilityCounts: { working: number; guidance: number; planned: number } }>) => {
        const data = event.data;
        setAiContextSummary(data.summary);
        setAiContextStatus(`Background context ready · ${data.toolCount} tools · ${data.actionCount} actions indexed · ${data.capabilityCounts.working} active, ${data.capabilityCounts.guidance} guidance, ${data.capabilityCounts.planned} planned`);
      };
      worker.onerror = () => setAiContextStatus("Background helper unavailable · editor remains usable");
    } catch { setAiContextStatus("Background helper unavailable · editor remains usable"); }
    return () => { aiWorker.current?.terminate(); aiWorker.current = null; };
  }, []);
  const selectedClip = clips.find(c => c.id === selected);
  const asset = assets.find(a => a.id === selectedClip?.assetId);
  const duration = useMemo(() => timelineDuration(clips), [clips]);
  const project = { ...makeProject(projectName), clips, assets: assets.map(({ file, objectUrl, ...a }) => a) };
  useEffect(() => {
    aiWorker.current?.postMessage({ type: "context", payload: { projectName, clipCount: clips.length, assetCount: assets.length, selectedClip: selectedClip ? { id: selectedClip.id, label: selectedClip.label, trackId: selectedClip.trackId, start: selectedClip.start, sourceIn: selectedClip.sourceIn, sourceOut: selectedClip.sourceOut } : null, activeTool, activeSubtool, playhead, aspectRatio } });
  }, [projectName, clips, assets.length, selectedClip?.id, selectedClip?.label, selectedClip?.trackId, selectedClip?.start, selectedClip?.sourceIn, selectedClip?.sourceOut, activeTool, activeSubtool, playhead, aspectRatio]);

  function applyClipChange(next: TimelineClip[], message: string) {
    setUndoStack(old => [...old.slice(-49), clips]);
    setRedoStack([]);
    setClips(next);
    setStatus(message);
  }
  function undoEdit() {
    if (!undoStack.length) { setStatus("Nothing to undo yet."); return; }
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(old => [...old, clips]);
    setUndoStack(old => old.slice(0, -1));
    setClips(previous);
    setSelected(previous.some(c => c.id === selected) ? selected : previous[previous.length - 1]?.id || null);
    setStatus("Undo complete");
  }
  function redoEdit() {
    if (!redoStack.length) { setStatus("Nothing to redo yet."); return; }
    const next = redoStack[redoStack.length - 1];
    setUndoStack(old => [...old, clips]);
    setRedoStack(old => old.slice(0, -1));
    setClips(next);
    setSelected(next.some(c => c.id === selected) ? selected : next[next.length - 1]?.id || null);
    setStatus("Redo complete");
  }
  function importMedia(files: FileList | null) {
    if (!files) return;
    const added: MediaAsset[] = Array.from(files).filter(f => /^(video|audio|image)\//.test(f.type)).map(file => ({
      id: uid(), name: file.name,
      kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      duration: file.type.startsWith("image/") ? 5 : 0, mimeType: file.type,
      file, objectUrl: URL.createObjectURL(file)
    }));
    setAssets(old => [...old, ...added]);
    added.forEach(a => {
      if (a.kind !== "image") {
        const probe = document.createElement(a.kind);
        probe.preload = "metadata"; probe.src = a.objectUrl!;
        probe.onloadedmetadata = () => setAssets(old => old.map(x => x.id === a.id ? { ...x, duration: Number.isFinite(probe.duration) ? probe.duration : 5 } : x));
      }
    });
    setStatus(added.length + " media file(s) imported");
  }
  function add(a: MediaAsset) {
    const c: TimelineClip = { id: uid(), assetId: a.id, trackId: a.kind === "audio" ? "audio-1" : "video-1", start: timelineDuration(clips), sourceIn: 0, sourceOut: a.duration || 5, label: a.name };
    applyClipChange([...clips, c], "Added to timeline"); setSelected(c.id); setPlayhead(c.start);
    if (a.kind === "video" && video.current) video.current.src = a.objectUrl!;
    setPage("editor");
  }
  function split() {
    if (!selectedClip) return;
    const at = selectedClip.sourceIn + playhead - selectedClip.start;
    if (at <= selectedClip.sourceIn + .04 || at >= selectedClip.sourceOut - .04) { setStatus("Place the playhead inside the clip to split"); return; }
    const right = { ...selectedClip, id: uid(), start: playhead, sourceIn: at, label: selectedClip.label + " (split)" };
    applyClipChange([...clips.map(c => c.id === selected ? { ...c, sourceOut: at } : c), right], "Clip split successfully");
    setSelected(right.id);
  }
  async function findOnlineMedia(query = mediaSearchQuery) {
    const term = query.trim();
    if (!term) { setMediaSearchStatus("Enter a subject or scene to search for."); return; }
    setMediaSearchBusy(true); setMediaSearchStatus("Searching Wikimedia Commons for reusable media…");
    try {
      const results = await searchWikimediaCommons(term);
      setMediaSearchResults(results);
      setMediaSearchStatus(results.length ? results.length + " candidate(s) found. Check each licence and attribution before use." : "No suitable reusable results found. Try another search phrase or use the storyboard fallback.");
    } catch (error) {
      setMediaSearchStatus(error instanceof Error ? error.message : "Online search failed. You can still use editor-native scenes.");
    } finally { setMediaSearchBusy(false); }
  }
  async function addSourcedImage(item: SourcedMediaResult) {
    try {
      const response = await fetch(item.downloadUrl);
      if (!response.ok) throw new Error("The source image could not be downloaded.");
      const blob = await response.blob();
      const file = new File([blob], item.fileName || (item.mediaKind === "video" ? "commons-video.webm" : "commons-image.jpg"), { type: blob.type || item.mimeType });
      const objectUrl = URL.createObjectURL(file);
      const sourced: MediaAsset = { id: uid(), name: item.title, kind: item.mediaKind, duration: item.mediaKind === "image" ? 5 : 0, mimeType: file.type, file, objectUrl, source: { type: "commons", pageUrl: item.pageUrl, creator: item.creator, license: item.license, licenseUrl: item.licenseUrl, attribution: item.attribution } };
      setAssets(old => [...old, sourced]);
      if (sourced.kind === "video") { const probe = document.createElement("video"); probe.preload = "metadata"; probe.src = objectUrl; probe.onloadedmetadata = () => setAssets(old => old.map(asset => asset.id === sourced.id ? { ...asset, duration: Number.isFinite(probe.duration) ? probe.duration : 5 } : asset)); }
      setStatus("Added licensed-source " + item.mediaKind + ": " + item.title);
    } catch (error) {
      setMediaSearchStatus(error instanceof Error ? error.message : "Could not import this source image.");
    }
  }
  async function analyzeAllMedia() {
    if (!assets.length) { setAiReply("Import media or search for reusable media first. There is nothing to analyse yet."); return; }
    setAnalysisBusy(true); setAiReply("Analysing media locally in the browser. Large files may take a little while.");
    const results: MediaAnalysis[] = [];
    for (const item of assets) {
      try { results.push(await analyzeMediaAsset(item)); }
      catch (error) { results.push({ assetId:item.id,name:item.name,kind:item.kind,duration:item.duration,fileSize:item.file?.size||0,notes:[error instanceof Error?error.message:"Analysis failed"] }); }
      setMediaAnalyses([...results]);
    }
    setMediaAnalyses(results); setAnalysisBusy(false);
    setAiReply("Media analysis finished for "+results.length+" asset(s). Image dimensions, video metadata/brightness samples and audio energy/silence estimates are available. Semantic object recognition and speech transcription are not connected yet.");
  }
  function runProjectVerification() {
    const result=verifyProject(assets,clips); const render=getRenderCapabilities();
    const lines=[result.ok?"Project structure check passed.":"Project structure check found issues.",...result.issues,render.summary];
    setEngineReport(lines);setAiReply(lines.join(" "));
  }
  function buildAIProjectTimeline() {
    if (!aiPlan) return;
    const visualAssets = assets.filter(item => item.kind === "video" || item.kind === "image");
    const sceneLength = aiPlan.duration / aiPlan.scenes.length;
    const additions: MediaAsset[] = [];
    const newClips: TimelineClip[] = [];
    let cursor = timelineDuration(clips);
    aiPlan.scenes.forEach((scene, index) => {
      const terms = scene.searchTerms.join(" ").toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3);
      const matched = visualAssets.find(item => terms.some(word => item.name.toLowerCase().includes(word))) || (visualAssets.length ? visualAssets[index % visualAssets.length] : undefined);
      let chosen = matched;
      if (!chosen) {
        const safeTitle = scene.title.replace(/[<>&"]/g, "");
        const safeTopic = aiPlan.title.replace(/[<>&"]/g, "");
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17143c"/><stop offset="1" stop-color="#07566b"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><circle cx="850" cy="320" r="300" fill="#8c70ff" opacity=".18"/><circle cx="120" cy="1600" r="380" fill="#20d7dc" opacity=".13"/><text x="90" y="820" fill="#9eeaf1" font-family="Arial" font-size="38" letter-spacing="9">NEXUS EDITOR</text><text x="90" y="980" fill="white" font-family="Arial" font-size="76" font-weight="700">' + safeTitle + '</text><foreignObject x="90" y="1060" width="900" height="360"><div xmlns="http://www.w3.org/1999/xhtml" style="font:32px Arial;color:#e5e7ff;line-height:1.4">' + safeTopic + '</div></foreignObject><text x="90" y="1770" fill="#b5b6d9" font-family="Arial" font-size="26">EDITABLE PROJECT STARTER · SCENE ' + (index + 1) + '</text></svg>';
        const file = new File([svg], 'nexus-scene-' + (index + 1) + '.svg', { type: "image/svg+xml" });
        const objectUrl = URL.createObjectURL(file);
        chosen = { id: uid(), name: scene.title + " · Native scene", kind: "image", duration: sceneLength, mimeType: "image/svg+xml", file, objectUrl, source: { type: "generated", attribution: "Created inside NEXUS Editor from editable project brief" } };
        additions.push(chosen);
      }
      const sourceDuration = chosen.kind === "image" ? sceneLength : Math.min(sceneLength, Math.max(0.5, chosen.duration || sceneLength));
      newClips.push({ id: uid(), assetId: chosen.id, trackId: "video-1", start: cursor, sourceIn: 0, sourceOut: sourceDuration, label: scene.title, aiScene: { title: scene.title, visual: scene.visual, narration: scene.narration, sourceType: chosen.source?.type === "commons" ? "commons" : chosen.source?.type === "personal" ? "personal" : "native-fallback" } });
      cursor += sourceDuration;
    });
    setAssets(old => [...old, ...additions]);
    applyClipChange([...clips, ...newClips], "AI storyboard added as " + newClips.length + " editable timeline scenes");
    setSelected(newClips[0]?.id || null);
    setPlayhead(newClips[0]?.start || 0);
    setActiveTool("edit"); setActiveSubtool("select"); setAiWorkflowStage("editing"); setPage("editor");
    setAiReply("Your storyboard is now on the timeline as editable clips. Existing media was matched where possible; missing scenes use native NEXUS title-card assets. You can select, reorder, split or replace the clips. No finished video has been rendered.");
  }
  function createAIProjectPlan(briefOverride?: string) {
    const brief = (briefOverride ?? aiBrief).trim();
    if (!brief) { setAiReply("Describe the video you want to make first."); return; }
    const words = brief.toLowerCase();
    const duration = /\b(\d+)\s*(seconds?|secs?|s)\b/.exec(words);
    const totalSeconds = Math.min(180, Math.max(15, duration ? Number(duration[1]) : 30));
    const topic = brief.replace(/\b(create|make|build|a|an|video|about|for|me|please|of)\b/gi, " ").replace(/\s+/g, " ").trim() || brief;
    const sceneIdeas = [
      { title: "Opening hook", visual: "A strong establishing shot that introduces the subject", narration: "Start with a short hook that makes the viewer curious.", searchTerms: [topic + " cinematic establishing shot", topic + " wide shot"], fallback: "Animated title, gradient background and subtle motion graphics" },
      { title: "The story", visual: "A close-up or action shot that shows the main idea", narration: "Explain the central idea with one clear, memorable point.", searchTerms: [topic + " close up footage", topic + " action b roll"], fallback: "Layered shapes, icons and kinetic typography" },
      { title: "The detail", visual: "A supporting scene that adds context or emotion", narration: "Add a useful detail, example or emotional beat.", searchTerms: [topic + " people lifestyle footage", topic + " detail b roll"], fallback: "A simple illustrated scene with editable text callouts" },
      { title: "The payoff", visual: "A powerful final shot that resolves the story", narration: "End with the key message and a clear final thought.", searchTerms: [topic + " cinematic final shot", topic + " inspirational footage"], fallback: "Bold closing title card with animated shapes" }
    ];
    const scenes = sceneIdeas.map((scene, index) => ({ ...scene, title: scene.title, narration: scene.narration, visual: scene.visual, searchTerms: scene.searchTerms }));
    setAiPlan({ title: topic.charAt(0).toUpperCase() + topic.slice(1), duration: totalSeconds, scenes, sourcingNote: assets.length ? "Your imported media can be analysed and matched to these scenes in the next creation step." : "No personal media detected. Search approved stock/public-domain sources first; if suitable reusable media is unavailable, use the listed editor-native fallback scenes. Wikimedia Commons search is available in the editor media panel." });
    setAiWorkflowStage("review");
    setAiReply("I've prepared an editable storyboard draft for your brief. Review the scenes and asset needs below. I haven't downloaded or imported any online media.");
    setProjectName(topic.charAt(0).toUpperCase() + topic.slice(1));
    setAspectRatio(aiFormat);
    setActiveTool("media");
  }
  function runAICommand() {
    const request = aiBrief.trim().toLowerCase();
    if (!request) return;
    if (aiMode === "teach") {
      if (!selectedClip) { setAiReply("Teaching mode: import or add media, then select a timeline clip. I can then walk you through the controls that are currently available."); return; }
      if (/split|cut/.test(request)) { setActiveTool("edit"); setActiveSubtool("split"); setAiReply("Teaching: move the playhead to the exact point inside the selected clip, then tap Split in the Edit ribbon. The two resulting pieces should appear on the timeline. I have highlighted the Split control; I have not changed the clip."); return; }
      if (/text|title/.test(request)) { setActiveTool("text"); setActiveSubtool("add"); setAiReply("Teaching: open Text, choose Add text, then edit the wording, font, size and colour in the controls. The current text is still a preview overlay, not a saved timed text layer."); return; }
      setAiReply("Teaching mode uses your current selection and tool. Try asking how to split a clip, add a title, or change the canvas ratio. I'll guide the steps instead of silently making the edit.");
      return;
    }
    if (aiMode === "ask") {
      const context = "Current project: " + projectName + ". Imported assets: " + assets.length + ". Timeline clips: " + clips.length + ". Selected clip: " + (selectedClip?.label || "none") + ". Active tool: " + activeTool + ". Canvas: " + aspectRatio + ".";
      setAiReply(context + " I can answer basic questions about the current workspace and explain supported controls. A connected reasoning model is not configured in this build yet.");
      return;
    }
    const engineCommand = interpretEditorCommand(request);
    if (engineCommand.type === "analyze") { void analyzeAllMedia(); return; }
    if (engineCommand.type === "guide") { setAiReply(makeEditingGuidance(selectedClip, mediaAnalyses.find(item=>item.assetId===selectedClip?.assetId), playhead)); return; }
    const toolNames: Record<string, string> = { edit: "edit", audio: "audio", text: "text", overlay: "overlay", effects: "effects", captions: "captions", filters: "filters", adjust: "adjust", media: "media", stickers: "stickers", background: "background", ratio: "ratio", export: "export" };
    const requestedTool = Object.keys(toolNames).find(name => new RegExp("\\b" + name + "\\b").test(request));
    if (/\b(guide me|what next|help|how do i|how to)\b/.test(request)) {
      if (!selectedClip) { setAiReply("First import a photo or video, add it to the timeline, then select its clip. I’ll guide you using the selected clip and active tool."); return; }
      setActiveTool("edit"); setActiveSubtool("select");
      setAiReply("Your clip “" + selectedClip.label + "” is selected. The playhead is at " + clock(playhead) + ". Choose a tool from the bottom dock; for a clean cut, move the playhead inside the clip and tap Split. I’ve highlighted Edit for you.");
      return;
    }
    if (/\b(split|cut)\b/.test(request)) {
      if (!selectedClip) { setAiReply("Select the clip you want to split first."); return; }
      setActiveTool("edit"); setActiveSubtool("split"); split();
      setAiReply("I sent the split command for “" + selectedClip.label + "”. If the playhead is too close to either end, move it inside the clip and try again. Check the timeline to confirm the cut.");
      return;
    }
    if (/\b(unmute)\b/.test(request)) {
      setMuteClip(false); setActiveTool("edit"); setActiveSubtool("volume"); setAiReply("Clip audio unmuted in the preview. This mute switch currently affects preview playback only, not exported audio."); return;
    }
    if (/\b(mute|silence)\b/.test(request)) {
      setMuteClip(true); setActiveTool("edit"); setActiveSubtool("volume"); setAiReply("Clip audio muted in the preview. Note: the current mute switch affects preview playback only; track-level audio export is not implemented yet."); return;
    }
    if (/\b(delete|remove)\b/.test(request) && /\b(clip|selected)\b/.test(request)) {
      if (!selectedClip) { setAiReply("Select the clip you want to remove first."); return; }
      applyClipChange(clips.filter(c => c.id !== selectedClip.id), "Clip removed from timeline. You can undo this."); setSelected(null);
      setAiReply("Removed “" + selectedClip.label + "” from the timeline."); return;
    }
    if (/\b(add|insert|create)\b.*\b(text|title)\b|\b(text|title)\b.*\b(add|insert|create)\b/.test(request)) {
      setActiveTool("text"); setActiveSubtool("add"); setOverlayText("Your text");
      setAiReply("Text editing is open and the preview text is ready to customise. Important: this text is currently a preview overlay, not yet a saved timeline text layer."); return;
    }
    const ratioMatch = request.match(/\b(9:16|16:9|1:1|4:5|3:4)\b/);
    if (ratioMatch && /\b(ratio|format|canvas|aspect)\b/.test(request)) {
      setAspectRatio(ratioMatch[1]); setActiveTool("ratio"); setActiveSubtool(ratioMatch[1]);
      setAiReply("Canvas preview ratio changed to " + ratioMatch[1] + ". Export rendering is not connected yet."); return;
    }
    if (requestedTool) {
      setActiveTool(requestedTool); setActiveSubtool(requestedTool === "edit" ? "select" : "");
      setAiReply("Opened the " + requestedTool + " tools in the editor. Its available controls are shown above the bottom dock. Some advanced operations are still under development.");
      return;
    }
    if (/\b(improve|better|suggest)\b/.test(request)) {
      setAiReply(selectedClip ? "For “" + selectedClip.label + "”, start by trimming any unwanted beginning/end, keep cuts aligned to the beat, then balance the audio. I can currently execute split, preview mute, text-overlay setup and ratio changes; I won’t pretend the other operations are applied." : "Import and select a clip first. Then I can give advice based on that clip and your timeline.");
      return;
    }
    if (/\bundo\b/.test(request)) { undoEdit(); setAiReply("Undo command sent. Check the timeline to confirm the restored edit."); return; }
    if (/\bredo\b/.test(request)) { redoEdit(); setAiReply("Redo command sent. Check the timeline to confirm the edit."); return; }
    setAiReply("I don’t have a connected language model in this build yet. I can understand a limited set of editor commands: split clip, mute/unmute preview, delete selected clip, add text overlay, change ratio, open a tool, or guide me.");
  }
  async function openProject(file?: File) {
    if (!file) return;
    try {
      const p = parseProject(await file.text());
      setProjectName(p.name); setClips(p.clips); setStatus("Project opened — re-import source media to relink assets"); setPage("editor");
    } catch { setStatus("Could not open this project file"); }
  }
  const nav = [
    { id: "home" as Page, label: "Home", icon: Home },
    { id: "editor" as Page, label: "Editor", icon: Clapperboard },
    { id: "projects" as Page, label: "Projects", icon: Folder },
    { id: "templates" as Page, label: "Templates", icon: Grid2X2 },
    { id: "ai" as Page, label: "AI Studio", icon: Sparkles },
    { id: "settings" as Page, label: "Settings", icon: Settings }
  ];
  const pageTitle = nav.find(n => n.id === page)?.label || "Home";
  const recent = ["My Vlog Edit", "Tech Review", "Birthday Bash"];
  const templates = [
    { name: "Travel Stories", type: "Lifestyle", color: "travel", length: "00:30" },
    { name: "Gaming Zone", type: "Gaming", color: "gaming", length: "00:20" },
    { name: "Business Pro", type: "Business", color: "business", length: "00:15" },
    { name: "Birthday Moments", type: "Lifestyle", color: "birthday", length: "00:25" },
    { name: "Neon Nights", type: "Gaming", color: "neon", length: "00:18" },
    { name: "Product Story", type: "Business", color: "product", length: "00:30" }
  ];
  const filteredTemplates = templates.filter(t => (templateCategory === "All" || t.type === templateCategory) && t.name.toLowerCase().includes(search.toLowerCase()));

  return <div className={darkMode ? "nexus-shell" : "nexus-shell light"} data-theme={theme}>
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => setPage("home")}><span className="brand-mark">N</span><span className="brand-words">NEXUS<strong>EDITOR</strong></span></button>
      <div className="side-caption">WORKSPACE</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => { setPage(item.id); setAiWorkspaceOpen(false); }}><Icon size={18}/><span>{item.label}</span>{item.id === "ai" && <i>NEW</i>}</button>; })}</nav>
      <div className="sidebar-bottom">
        <div className="cloud-card"><Cloud size={19}/><b>Your workspace</b><span>Projects saved on this device</span><div className="cloud-meter"><i/></div><small>Local storage · Ready</small></div>
        <button className="profile-row" onClick={() => setPage("settings")}><span className="avatar">N</span><span><b>Creator workspace</b><small>Personal account</small></span><ChevronDown size={15}/></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="top-header">
        <div className="mobile-brand"><span className="brand-mark">N</span><b>NEXUS EDITOR</b></div>
        <div className="crumb"><span>Workspace</span><b>/</b><strong>{pageTitle}</strong></div>
        <label className="global-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects, templates..."/><kbd>⌘ K</kbd></label>
        <button className="icon-button" aria-label="Notifications" onClick={() => setStatus("You're all caught up")}><Bell size={18}/><i/></button>
        <button className="avatar top-avatar" onClick={() => setPage("settings")}>N</button>
      </header>

      {page === "home" && <section className="page-content">
        <div className="welcome-line"><div><div className="eyebrow">YOUR CREATIVE WORKSPACE</div><h1>Welcome back, Creator <span>✦</span></h1><p>Ready to turn your next idea into something incredible?</p></div><button className="outline-button" onClick={() => projectInput.current?.click()}><FolderOpen size={16}/> Open project</button></div>
        <div className="hero-banner"><div className="hero-copy"><span className="hero-tag"><Sparkles size={13}/> THE CREATIVE PLAYGROUND</span><h2>Edit smarter.<br/>Create <em>bigger.</em></h2><p>Everything you need to bring your vision to life, in one place.</p><button className="gradient-button" onClick={() => setPage("editor")}>Start creating <ArrowDownToLine size={16}/></button></div><div className="hero-art"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-clapper"><div/><span>▶</span></div><div className="hero-glow"/></div></div>
        <div className="quick-grid">
          <button className="quick-card" onClick={() => { setProjectName("Untitled Project"); setClips([]); setAssets([]); setPage("editor"); }}><span className="quick-icon purple"><Plus/></span><b>New project</b><small>Start from scratch</small></button>
          <button className="quick-card" onClick={() => setPage("templates")}><span className="quick-icon cyan"><Grid2X2/></span><b>Explore templates</b><small>Find your style</small></button>
          <button className="quick-card" onClick={() => {setPage("ai");setAiWorkspaceOpen(false);}}><span className="quick-icon violet"><WandSparkles/></span><b>AI Studio</b><small>Plan your creation with AI</small></button>
          <button className="quick-card" onClick={() => setPage("projects")}><span className="quick-icon amber"><Folder/></span><b>My projects</b><small>Your creations</small></button>
        </div>
        <div className="section-heading"><div><h2>Recent projects</h2><p>Pick up where you left off</p></div><button className="text-link" onClick={() => setPage("projects")}>View all <span>→</span></button></div>
        <div className="recent-grid">{recent.map((name, i) => <button className="recent-card" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>{i === 0 ? "VLOG / 01" : i === 1 ? "TECH / 02" : "MOMENTS / 03"}</span><b>{i === 0 ? "Make it a story." : i === 1 ? "Ideas in motion." : "Keep the moment."}</b></div><div className="recent-info"><span><b>{name}</b><small>{i === 0 ? "Edited recently" : i === 1 ? "Yesterday" : "2 days ago"}</small></span><span className="more-dots">•••</span></div></button>)}</div>
      </section>}

      {page === "ai" && <section className="page-content ai-studio-page">
        <div className="page-title-row"><div><div className="eyebrow">STAGE 1 · IDEA & CREATIVE DIRECTION</div><h1>NEXUS AI Studio <span>✦</span></h1><p>Develop the idea, review every scene, and approve the plan before editing begins.</p></div><button className="outline-button" onClick={()=>{setAiPlan(null);setAiWorkflowStage("idea");setAiChatMessages([{role:"assistant",text:"New idea ready. What would you like to create?"}]);setAiBrief("");}}>＋ New idea</button></div>
        <div className="ai-live-steps"><div className={aiWorkflowStage==="editing"?"complete":"current"}><b>01</b><span>AI planning & approval</span><small>{aiWorkflowStage==="idea"?"Waiting for your idea":aiWorkflowStage==="planning"?"Building the first scene plan…":aiWorkflowStage==="review"?"Blueprint ready · changes welcome":"Approved · moving to editor"}</small></div><div className={aiWorkflowStage==="editing"?"current":"pending"}><b>02</b><span>Editing workspace</span><small>{aiWorkflowStage==="editing"?"Timeline created · edit your scenes":"Starts after plan approval"}</small></div><div className="pending"><b>03</b><span>Rendering & export</span><small>Next engine milestone · not yet enabled</small></div></div>
        <div className="ai-studio-layout">
          <div className="ai-studio-chat">
            <div className="ai-studio-chat-head"><span className="ai-studio-orb"><Sparkles size={19}/></span><div><b>NEXUS CREATIVE PARTNER</b><small>IDEA DEVELOPMENT · LIVE WORKFLOW GUIDANCE</small></div><span className="ai-studio-stage">STAGE 1 / 3</span></div>
            <div className="ai-studio-messages">{aiChatMessages.map((m,i)=><article key={i} className={"ai-studio-message "+m.role}><b>{m.role==="assistant"?"NEXUS AI":"YOU"}</b><p>{m.text}</p></article>)}</div>
            <div className="ai-studio-compose"><textarea value={aiBrief} onChange={e=>setAiBrief(e.target.value)} placeholder="Describe your video idea, audience, message, style or the change you want..." rows={3}/><button onClick={()=>{
              const message=aiBrief.trim(); if(!message)return;
              setAiChatMessages(old=>[...old,{role:"user",text:message}]);
              if(!aiPlan){void (async()=>{setAiWorkflowStage("planning");await new Promise(resolve=>window.setTimeout(resolve,350));createAIProjectPlan(message);setAiChatMessages(old=>[...old,{role:"assistant",text:"The first-pass blueprint is ready. Review the scenes, visuals and narration on the right. You can request changes before approval. This deployment currently uses a local planning engine; a connected generative AI model is still a separate integration milestone."}]);})();}
              else {const lower=message.toLowerCase();let response="I’ve recorded your change request. The current planning engine supports simple structural revisions; deeper creative rewrites need the connected AI model.";let next=aiPlan;
                if(/add (a )?scene|another scene/.test(lower)){const label=message.replace(/add (a )?scene( about| for| showing)?/i,"").trim()||"Additional scene";next={...next,scenes:[...next.scenes,{title:label.slice(0,48),visual:"A focused visual sequence showing "+label,narration:"Connect this moment to the main story and reinforce its message.",searchTerms:[label,next.title],fallback:"An editable NEXUS title card with supporting shapes and text"}]};response="Added a scene to the blueprint. Check its visuals and narration, then tell me if you want anything else changed.";}
                else if(/remove (the )?(last )?scene|delete (the )?(last )?scene/.test(lower)&&next.scenes.length>1){next={...next,scenes:next.scenes.slice(0,-1)};response="Removed the last scene from the blueprint.";}
                else if(/shorter|shorten/.test(lower)){next={...next,duration:Math.max(10,Math.round(next.duration*.75))};response="Shortened the target duration. Review the updated blueprint.";}
                else if(/longer|extend/.test(lower)){next={...next,duration:Math.min(180,Math.round(next.duration*1.25))};response="Extended the target duration. Review the updated blueprint.";}
                else {const match=lower.match(/(\d+)\s*(seconds?|secs?)\b/);if(match){next={...next,duration:Math.min(180,Math.max(10,Number(match[1])))};response="Updated the target duration to "+next.duration+" seconds.";}}
                setAiPlan(next);setAiChatMessages(old=>[...old,{role:"assistant",text:response}]);
              }
              setAiBrief("");
            }}><Sparkles size={15}/> Send</button></div>
            <small className="ai-studio-hint">Each step is shown above as the project moves forward. Enter a change request any time before approval.</small>
          </div>
          <aside className="ai-studio-plan"><div className="ai-studio-plan-head"><div><div className="eyebrow">CREATIVE BLUEPRINT</div><h2>{aiPlan?.title||"Your idea, mapped out"}</h2></div><span className="ai-studio-stage">LIVE PLAN</span></div>
            {!aiPlan?<div className="ai-studio-empty"><Sparkles size={28}/><b>Your visual plan will appear here</b><p>First, share the idea. The plan will show the story structure, scene-by-scene visuals, narration, media search terms and fallback options.</p><div><span>✓ Understand the brief</span><span>✓ Map the story</span><span>✓ Plan visuals and narration</span><span>✓ Review before editing</span></div></div>:<>
              <div className="ai-studio-plan-meta"><span>{aiPlan.duration}s target</span><span>{aiPlan.scenes.length} scenes</span><span>{aiFormat}</span><span>{aiStyle}</span></div>
              <div className="ai-studio-scenes">{aiPlan.scenes.map((scene,i)=><article key={i}><div className="ai-studio-scene-title"><b>{String(i+1).padStart(2,"0")} · {scene.title}</b><span>{Math.round(aiPlan.duration/aiPlan.scenes.length)}s</span></div><p><strong>Visuals</strong>{scene.visual}</p><p><strong>Voice / script</strong>{scene.narration}</p><small>Search: {scene.searchTerms.join(" · ")}</small><small>Fallback: {scene.fallback}</small></article>)}</div>
              <p className="ai-studio-source-note">{aiPlan.sourcingNote}</p><div className="ai-studio-plan-actions"><button className="outline-button" onClick={()=>setAiChatMessages(old=>[...old,{role:"assistant",text:"Tell me the exact change you want. You can add/remove a scene, change the duration, or request a different direction."}])}>Request changes</button><button className="gradient-button" onClick={()=>{setAiWorkflowStage("editing");buildAIProjectTimeline();}}>Approve & build timeline <ArrowRight size={15}/></button></div>
            </>}
          </aside>
        </div>
        <p className="ai-studio-disclaimer"><CheckCircle2 size={15}/> The timeline is not created until you approve this blueprint. The AI planning page is separate from the editor.</p>
      </section>}

      {page === "editor" && <section className="editor-fullscreen">
        <header className="editor-topbar">
          <button className="editor-back" onClick={()=>{setPage("home");setEditorView("workspace");}}><ArrowLeft size={18}/><span>NEXUS</span></button>
          <div className="editor-project-title"><b>{projectName}</b><small>{editorView==="workspace"?"Editing workspace":editorView==="import"?"Media library":"Export project"}</small></div>
          <button className={"editor-top-icon ai-editor-trigger"+(aiWorkspaceOpen?" active":"")} onClick={()=>setAiWorkspaceOpen(v=>!v)} title="Toggle NEXUS AI guidance"><Sparkles size={18}/><span>AI</span></button><button className="editor-top-icon" onClick={()=>downloadProject(project,assets)} title="Save project"><Check size={18}/></button>
          <button className="editor-export-entry" onClick={()=>setEditorView("export")}><ArrowDownToLine size={16}/><span>Export</span></button>
        </header>
        <input ref={mediaInput} hidden type="file" accept="image/*,video/*" multiple onChange={e=>{importMedia(e.target.files);setEditorView("workspace");setShowAttachmentPicker(false);e.currentTarget.value="";}}/>
        <input ref={audioInput} hidden type="file" accept="audio/*" multiple onChange={e=>{importMedia(e.target.files);setEditorView("workspace");setShowAttachmentPicker(false);e.currentTarget.value="";}}/>
        <input ref={filesInput} hidden type="file" multiple onChange={e=>{importMedia(e.target.files);setEditorView("workspace");setShowAttachmentPicker(false);e.currentTarget.value="";}}/>
        {showAttachmentPicker && <div className="attachment-backdrop" onClick={()=>setShowAttachmentPicker(false)}>
          <section className="attachment-sheet" role="dialog" aria-modal="true" aria-label="Add media" onClick={e=>e.stopPropagation()}>
            <div className="attachment-sheet-handle"/>
            <div className="attachment-sheet-heading"><div><b>Add to your project</b><small>Choose media from your device</small></div><button onClick={()=>setShowAttachmentPicker(false)} aria-label="Close"><X size={19}/></button></div>
            <div className="attachment-options">
              <button onClick={()=>mediaInput.current?.click()}><span className="attachment-option-icon photos"><ImageIcon size={23}/></span><b>Photos & Videos</b><small>Open your gallery</small></button>
              <button onClick={()=>audioInput.current?.click()}><span className="attachment-option-icon audio"><Music2 size={23}/></span><b>Audio</b><small>Choose music or sound</small></button>
              <button onClick={()=>filesInput.current?.click()}><span className="attachment-option-icon files"><FolderOpen size={23}/></span><b>Browse files</b><small>Choose from device storage</small></button>
            </div>
          </section>
        </div>}
        {editorView==="workspace" && <div className="editor-screen">
          <div className="editor-preview-zone">
            <div className="editor-preview-meta"><span>PREVIEW</span><div className="preview-meta-actions"><button onClick={()=>setShowAttachmentPicker(true)} className="preview-add-media"><Plus size={14}/> Add media</button><button onClick={()=>{setActiveTool("adjust");setActiveSubtool("Position");}}><SlidersHorizontal size={14}/> Adjust</button></div></div>
            <div className={"editor-preview-frame ratio-frame ratio-"+aspectRatio.replace(":","-")}>
              {asset?.kind==="video"&&asset.objectUrl?<video ref={video} src={asset.objectUrl} controls playsInline muted={muteClip}/>:asset?.kind==="image"&&asset.objectUrl?<img src={asset.objectUrl} alt="Selected media preview"/>:<div className="editor-preview-empty"><div className="preview-n">N</div><b>Your story starts here</b><small>Import media to begin editing</small><button onClick={()=>setShowAttachmentPicker(true)}><Plus size={16}/> Import media</button></div>}
              {activeTool==="text" && <div className="nexus-text-overlay" style={{fontSize:textSize,color:textColor,fontFamily:textFont}}>{overlayText || "Type your text"}</div>}
            </div>
            <div className="editor-transport"><button onClick={()=>{if(video.current){video.current.currentTime=Math.max(0,video.current.currentTime-1);setPlayhead(Math.max(0,playhead-1));}}}>−1s</button><button className="editor-play" onClick={()=>{if(video.current){if(video.current.paused)void video.current.play();else video.current.pause();}}}><Play size={17} fill="currentColor"/></button><button onClick={()=>{if(video.current){video.current.currentTime+=1;setPlayhead(video.current.currentTime);}}}>+1s</button><span>{clock(playhead)} / {clock(duration)}</span></div>
          </div>
          <div className="editor-timeline-zone">
            <div className="editor-timeline-head"><div><b>Timeline</b><small>{clips.length} clips · {clock(duration)}</small></div><div className="editor-timeline-actions"><button onClick={split} title="Split"><Scissors size={16}/></button><button disabled={!selectedClip} onClick={()=>{applyClipChange(clips.filter(c=>c.id!==selected), "Clip deleted");setSelected(null);}} title="Delete"><Trash2 size={16}/></button><button onClick={undoEdit} disabled={!undoStack.length} title="Undo"><ArrowLeft size={16}/></button><button onClick={redoEdit} disabled={!redoStack.length} title="Redo"><Command size={16}/></button></div></div>
            <div className="editor-timeline-scroll"><div className="editor-timeline-ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span></div>
              <div className="editor-timeline-rows"><div className="editor-lane-labels"><span>V1 <small>Video</small></span><span>V2 <small>Overlay</small></span><span>T1 <small>Text</small></span><span className="audio-lane-label">A1 <small>Audio</small><button onClick={()=>audioInput.current?.click()} aria-label="Add audio"><Plus size={13}/></button></span></div><div className="editor-lanes"><div className="editor-lanes-inner">
                {["video-1","overlay-1","text-1","audio-1"].map((id,i)=><div className="editor-lane" key={id}>{clips.filter(c=>c.trackId===id).map(c=><button key={c.id} className={selected===c.id?"editor-clip active":"editor-clip"} style={{left:c.start*50,width:Math.max(70,clipDuration(c)*50)}} onClick={()=>{setSelected(c.id);setPlayhead(c.start);const a=assets.find(x=>x.id===c.assetId);if(a?.kind==="video"&&video.current)video.current.src=a.objectUrl||"";}}>{c.label}</button>)}{i===2&&<small className="empty-lane-note">Text layers</small>}</div>)}
                <div className="editor-playhead" style={{left:playhead*50}}/><input aria-label="Timeline playhead" className="editor-timeline-scrub" type="range" min="0" max={Math.max(duration,1)} step=".1" value={Math.min(playhead,Math.max(duration,1))} onChange={e=>setPlayhead(Number(e.target.value))}/>
              </div></div></div>
            </div>
          </div>
          {aiWorkspaceOpen && <div className="nexus-ai-inline">
            <div className="nexus-ai-inline-head"><span className="nexus-ai-mark"><Sparkles size={16}/></span><div><b>NEXUS AI</b><small>{selectedClip ? "Working with selected clip · "+(selectedClip.label||"Media") : clips.length ? "Your editing workspace is ready" : "Tell me what you want to create"}</small></div><div className="nexus-ai-quick-prompts">{["Guide me","Improve this edit","What next?"].map(x=><button key={x} onClick={()=>setAiBrief(x)}>{x}</button>)}</div><div className="nexus-ai-modes"><button className={aiMode==="create"?"active":""} onClick={()=>setAiMode("create")}>Create</button><button className={aiMode==="teach"?"active":""} onClick={()=>setAiMode("teach")}>Teach</button><button className={aiMode==="ask"?"active":""} onClick={()=>setAiMode("ask")}>Ask</button></div><button className="nexus-ai-close" onClick={()=>setAiWorkspaceOpen(false)} aria-label="Close AI assistant"><X size={16}/></button></div>
            {aiMode === "create" && <div className="nexus-ai-create">
              <div className="nexus-ai-create-options">
                <label>Creation style<select value={aiStyle} onChange={e=>setAiStyle(e.target.value)}><option>Cinematic</option><option>Documentary</option><option>Motivational</option><option>Social media</option><option>Product promo</option><option>Educational</option></select></label>
                <label>Format<select value={aiFormat} onChange={e=>setAiFormat(e.target.value)}><option>9:16</option><option>16:9</option><option>1:1</option><option>4:5</option><option>3:4</option></select></label>
                <button onClick={()=>mediaInput.current?.click()}><Upload size={14}/> Add my media ({assets.length})</button><button disabled={analysisBusy||!assets.length} onClick={()=>void analyzeAllMedia()}>{analysisBusy?"Analysing…":"Analyse media"}</button><button onClick={runProjectVerification}>Verify project</button>
              </div>
              <textarea value={aiBrief} onChange={e=>setAiBrief(e.target.value)} placeholder="Describe the video you want NEXUS to help you create… You can start with an empty media library." rows={3}/>
              <button className="nexus-ai-plan-button" onClick={createAIProjectPlan}><Sparkles size={15}/> Create editable project plan</button>
              <div className="nexus-ai-online-search">
                <b>Find media online</b>
                <div><input value={mediaSearchQuery} onChange={e=>setMediaSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")findOnlineMedia();}} placeholder="Search a scene or subject…"/><button disabled={mediaSearchBusy} onClick={()=>findOnlineMedia()}>{mediaSearchBusy?"Searching…":"Search"}</button></div>
                <small>{mediaSearchStatus || "Search Wikimedia Commons for openly licensed images and video files. Review the licence before using any result."}</small>
                {mediaSearchResults.map(item=><article key={item.id}><img src={item.thumbnailUrl} alt=""/><span><b>{item.title}</b><small>{item.mediaKind.toUpperCase()} · {item.license} · {item.creator || "Creator not listed"}</small><small>{item.attribution || "Check source attribution requirements"}</small><button onClick={()=>addSourcedImage(item)}>Add to media library</button><a href={item.pageUrl} target="_blank" rel="noreferrer">View source and licence</a></span></article>)}
              </div>
              {mediaAnalyses.length>0 && <div className="nexus-ai-analysis-results"><b>Media analysis · {mediaAnalyses.length} assets</b>{mediaAnalyses.map(item=><article key={item.assetId}><b>{item.name}</b><small>{item.kind.toUpperCase()} · {item.duration.toFixed(1)}s · {item.width?item.width+"×"+item.height:"dimensions unavailable"} · {(item.fileSize/1048576).toFixed(1)} MB</small>{item.audio&&<small>Audio RMS {(item.audio.rms*100).toFixed(1)}% · estimated silence {(item.audio.silenceRatio*100).toFixed(0)}% · {item.audio.beatCandidates.length} transient candidates</small>}{item.visual&&<small>{item.visual.sampledFrames} visual samples · {item.visual.sceneChanges.length} brightness-change candidates · average brightness {(item.visual.averageLuminance*100).toFixed(0)}%</small>}<small>{item.notes.join(" ")}</small></article>)}</div>}{engineReport.length>0&&<div className="nexus-ai-analysis-results"><b>Project verification</b>{engineReport.map((line,i)=><small key={i}>{line}</small>)}</div>}
              {aiPlan && <div className="nexus-ai-storyboard">
                {aiPlan.scenes.map((scene,index)=><article key={scene.title}><b>{index+1}. {scene.title}</b><p>{scene.visual}</p><small>Search for: {scene.searchTerms.join(" · ")}</small><small>Fallback: {scene.fallback}</small></article>)}
                <p className="nexus-ai-sourcing-note">{aiPlan.sourcingNote}</p><button className="nexus-ai-plan-button" onClick={buildAIProjectTimeline}>Build editable timeline</button>
              </div>}
            </div>}
            <div className="nexus-ai-inline-compose"><input value={aiBrief} onChange={e=>setAiBrief(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runAICommand();}} placeholder="Ask about your edit or give an editing command…"/><button onClick={runAICommand}><Sparkles size={16}/> Ask</button></div>
            <p className="nexus-ai-reply" aria-live="polite">{aiReply}</p><small className="nexus-ai-context-status" title={aiContextSummary}>{aiContextStatus}</small>
          </div>}
          <div className="editor-bottom-tools nexus-tool-stack">
            <div className="nexus-subtool-ribbon">
              {activeTool==="edit" && <>{[["select","Select"],["split","Split"],["volume","Mute clip"],["speed","Speed"],["animation","Animation"],["cover","Cover"],["delete","Delete"]].map(([id,label])=><button key={id} className={activeSubtool===id?"active":""} onClick={()=>{setActiveSubtool(id);if(id==="split")split();if(id==="volume")setMuteClip(v=>!v);if(id==="delete"&&selectedClip){applyClipChange(clips.filter(c=>c.id!==selected), "Clip deleted");setSelected(null);}if(["speed","animation","cover"].includes(id))setStatus(label+" controls are not connected to the render engine yet.");}}>{label}</button>)}</>}
              {activeTool==="audio" && <>{[["sounds","Sounds"],["extract","Extract"],["voiceover","Voiceover"],["effects","Effects"],["fade","Fade"],["volume","Volume"]].map(([id,label])=><button key={id} onClick={()=>{setActiveSubtool(id);if(id==="sounds"||id==="extract")audioInput.current?.click();else setStatus(label+" controls selected.");}}>{label}</button>)}</>}
              {activeTool==="text" && <>{[["add","Add text"],["font","Fonts"],["style","Style"],["animation","Animation"],["align","Align"],["captions","Auto captions"]].map(([id,label])=><button key={id} className={activeSubtool===id?"active":""} onClick={()=>{setActiveSubtool(id);if(id==="add"){setOverlayText("Your text");setStatus("Text added to preview.");}else if(id==="captions")setStatus("Auto captions need speech recognition and caption-layer support.");}}>{label}</button>)}</>}
              {activeTool==="overlay" && <>{["Add overlay","Mask","Blend","Position","Opacity"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);if(x==="Add overlay")setShowAttachmentPicker(true);else setStatus(x+" controls selected.");}}>{x}</button>)}</>}
              {activeTool==="effects" && <>{["Video effects","Body effects","Transitions","Keyframes"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" selected; effect rendering is not connected yet.");}}>{x}</button>)}</>}
              {activeTool==="captions" && <>{["Auto captions","Manual captions","Caption style","Language"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" selected.");}}>{x}</button>)}</>}
              {activeTool==="filters" && <>{["Original","Cinematic","Vintage","Warm","Cool","B&W"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" filter selected; live filter rendering is pending.");}}>{x}</button>)}</>}
              {activeTool==="adjust" && <>{["Brightness","Contrast","Saturation","Exposure","Temperature","HSL"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" adjustment selected.");}}>{x}</button>)}</>}
              {activeTool==="media" && <><button onClick={()=>setShowAttachmentPicker(true)}>＋ Add media</button><button onClick={()=>setEditorView("import")}>Media library</button></>}
              {activeTool==="stickers" && <>{["Emoji","Stickers","Shapes","Import"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);if(x==="Import")setShowAttachmentPicker(true);else setStatus(x+" browser selected.");}}>{x}</button>)}</>}
              {activeTool==="background" && <>{["Color","Blur","Canvas"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" background controls selected.");}}>{x}</button>)}</>}
              {activeTool==="ratio" && <>{["9:16","16:9","1:1","4:5","3:4"].map(x=><button key={x} className={aspectRatio===x?"active":""} onClick={()=>setAspectRatio(x)}>{x}</button>)}</>}
            </div>
            {activeTool==="text" && <div className="nexus-context-controls"><input aria-label="Edit preview text" value={overlayText} onChange={e=>setOverlayText(e.target.value)} placeholder="Type text"/><select aria-label="Font" value={textFont} onChange={e=>setTextFont(e.target.value)}><option>Arial</option><option>Georgia</option><option>Impact</option><option>Courier New</option></select><label>Size <input type="range" min="12" max="72" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/></label><input aria-label="Text colour" type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></div>}
            {activeTool==="adjust" && <div className="nexus-context-controls"><label>{activeSubtool}<input type="range" min="0" max="200" defaultValue="100"/></label></div>}
            {activeTool==="edit" && selectedClip && <div className="nexus-context-controls"><button onClick={split}><Scissors size={15}/> Split at playhead</button><button className={muteClip?"active":""} onClick={()=>setMuteClip(v=>!v)}><Volume2 size={15}/> {muteClip?"Unmute":"Mute clip"}</button><button onClick={()=>setStatus("Clip trim handles are not yet connected.")}>Trim</button></div>}
            <nav className="editor-tool-dock" aria-label="Editing tools">{[{id:"edit",label:"Edit",icon:Scissors},{id:"audio",label:"Audio",icon:Music2},{id:"text",label:"Text",icon:Type},{id:"overlay",label:"Overlay",icon:Layers},{id:"effects",label:"Effects",icon:WandSparkles},{id:"captions",label:"Captions",icon:Captions},{id:"filters",label:"Filters",icon:SlidersHorizontal},{id:"adjust",label:"Adjust",icon:Palette},{id:"media",label:"Media",icon:Film},{id:"stickers",label:"Stickers",icon:Sticker},{id:"background",label:"Background",icon:ImageIcon},{id:"ratio",label:"Ratio",icon:Crop}].map(item=>{const Icon=item.icon;return <button key={item.id} className={activeTool===item.id?"active":""} onClick={()=>{setActiveTool(item.id);setActiveSubtool(item.id==="edit"?"select":"");if(item.id==="media")setShowAttachmentPicker(true);}}><Icon size={19}/><span>{item.label}</span></button>;})}</nav>
          </div>
          <div className="editor-status-line"><i/>{status}</div>
        </div>}
        {editorView==="import" && <div className="editor-subpage"><div className="editor-subpage-title"><button onClick={()=>setEditorView("workspace")}><ArrowLeft size={18}/></button><div><h2>Import media</h2><p>Add videos, photos and audio to this project.</p></div></div><button className="huge-import-zone" onClick={()=>setShowAttachmentPicker(true)}><Plus size={38}/><b>Choose from gallery</b><span>Open your phone gallery to select photos and videos</span><small>Photos · Videos · Audio · Files</small></button><div className="imported-media-list"><h3>Imported media ({assets.length})</h3>{assets.map(a=><div key={a.id}><span>{a.kind==="audio"?<Music2/>:a.kind==="image"?<ImageIcon/>:<Film/>}</span><b>{a.name}</b><small>{a.kind.toUpperCase()} · {a.duration?clock(a.duration):"Reading…"}</small><button onClick={()=>{add(a);setEditorView("workspace");}}><Plus size={16}/> Add</button></div>)}</div></div>}
        {editorView==="export" && <div className="editor-subpage export-subpage"><div className="editor-subpage-title"><button onClick={()=>setEditorView("workspace")}><ArrowLeft size={18}/></button><div><h2>Export video</h2><p>Choose the quality and format for your finished video.</p></div></div><div className="export-center-layout"><div className="export-completion-card"><div className="export-big-icon"><Film size={32}/></div><h3>Ready to export</h3><p>{projectName} · {clock(duration)} · {clips.length} clips</p><div className="export-summary-row"><span>Resolution</span><b>{exportQuality}</b></div><div className="export-summary-row"><span>Frame rate</span><b>{exportFps}</b></div><div className="export-summary-row"><span>Aspect ratio</span><b>{aspectRatio}</b></div><button className="export-render-button" onClick={()=>setStatus("Video rendering is not implemented yet. No video has been saved or exported.")}><ArrowDownToLine size={18}/> Export video</button><small>Rendering is still being built. Export and sharing will activate when the video engine is ready.</small></div><div className="export-options-panel"><h3>Export options</h3><label>Video quality<select value={exportQuality} onChange={e=>setExportQuality(e.target.value)}><option>720p</option><option>1080p</option><option>2K</option><option>4K Ultra HD</option></select></label><label>Frame rate<select value={exportFps} onChange={e=>setExportFps(e.target.value)}><option>24 FPS</option><option>30 FPS</option><option>60 FPS</option></select></label><button className="export-quick-action" onClick={()=>setStatus("Speed controls are available from the clip editing tools in a later phase.")}><Gauge size={18}/> Adjust speed</button><h3>Share destinations</h3><div className="export-share-grid">{["TikTok","YouTube","WhatsApp","Instagram","Facebook","Other"].map((name,i)=><button key={name} disabled><Share2 size={17}/><span>{name}</span></button>)}</div><small>Share options appear after a video has been rendered and saved to your device.</small></div></div></div>}

      </section>}

      {page === "projects" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">YOUR CREATIONS</div><h1>My projects</h1><p>All your creative work, in one place.</p></div><button className="gradient-button" onClick={() => { setProjectName("Untitled Project"); setClips([]); setAssets([]); setPage("editor"); }}><Plus size={16}/> New project</button></div><div className="project-filter"><button className="filter-active">All projects</button><button>Videos</button><button>Drafts</button><span>{recent.length} projects</span></div><div className="project-grid">{recent.filter(n => n.toLowerCase().includes(search.toLowerCase())).map((name, i) => <button className="project-tile" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>PROJECT / 0{i + 1}</span></div><div><b>{name}</b><small>Local project · {i === 0 ? "Today" : i === 1 ? "Yesterday" : "2 days ago"}</small></div></button>)}</div></section>}

      {page === "templates" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">A LITTLE CREATIVE INSPIRATION</div><h1>Explore templates</h1><p>Choose a starting point for your next story.</p></div></div><div className="category-tabs">{["All", "Lifestyle", "Gaming", "Business"].map(c => <button key={c} className={templateCategory === c ? "tab-active" : ""} onClick={() => setTemplateCategory(c)}>{c}</button>)}</div><div className="template-grid">{filteredTemplates.map(t => <button className="template-card" key={t.name} onClick={() => { setProjectName(t.name); setPage("editor"); setStatus("Template selected — add your own media to begin"); }}><div className={"template-art " + t.color}><span className="template-play"><Play size={18} fill="currentColor"/></span><small>{t.length}</small></div><div><b>{t.name}</b><small>{t.type} · Template preview</small></div></button>)}</div></section>}



      {page === "settings" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Settings</h1><p>Manage your workspace preferences.</p></div></div><div className="settings-layout"><div className="settings-nav"><b>Preferences</b><span>Appearance</span><span>Workspace</span><span>About</span></div><div className="settings-content"><h2>Appearance</h2><p>Choose how NEXUS EDITOR looks on your device.</p><div className="setting-row"><span><b>Dark appearance</b><small>Use the dark creative workspace theme.</small></span><button className={darkMode ? "toggle on" : "toggle"} onClick={() => setDarkMode(!darkMode)}><i/></button></div><div className="theme-picker-block">
            <div className="theme-picker-heading"><b>Colour theme</b><small>Pick the colour style for your entire workspace.</small></div>
            <div className="theme-options">{themes.map(t => <button key={t.id} className={theme === t.id ? "theme-option selected" : "theme-option"} onClick={() => changeTheme(t.id)} aria-pressed={theme === t.id}><span className="theme-swatches">{t.colors.map((color, i) => <i key={i} style={{ background: color }} />)}</span><span className="theme-option-name">{t.name}</span>{theme === t.id && <Check size={15} className="theme-check" />}</button>)}</div>
          </div>
          <div className="setting-row"><span><b>Workspace storage</b><small>Projects and media remain on this device.</small></span><span className="setting-value">Local</span></div><div className="setting-row"><span><b>Project format</b><small>Portable NEXUS project metadata.</small></span><span className="setting-value">.nexusproj</span></div><div className="about-card"><span className="brand-mark">N</span><div><b>NEXUS EDITOR</b><small>VELTRONIX NEXUS · Creative workspace</small></div></div></div></div></section>}
      <footer className="app-footer"><span>© VELTRONIX NEXUS</span><span>CREATE · EDIT · INSPIRE</span></footer>
    </main>
  </div>;
}
