import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
const SOUND_EFFECT_CATEGORIES = ["Whoosh","Reverse whoosh","Air sweep","Soft impact","Heavy impact","Cinematic hit","Bass hit","Riser","Downlifter","Transition sweep","Pop","Click","Tap","Button press","Keyboard typing","Mouse click","Notification ping","Success chime","Error beep","Digital glitch","Retro game blip","Laser zap","Sparkle","Magic shimmer","Bell","Clock tick","Camera shutter","Film projector","Vinyl crackle","Crowd cheer","Applause","Laughter","Footsteps","Door knock","Door open","Door close","Page turn","Paper rustle","Water splash","Rain ambience","Ocean waves","Wind ambience","Birds ambience","Fire crackle","Thunder rumble","Heartbeat","Mechanical hum","Engine start","Car pass-by","Dramatic boom","Anime impact","Cartoon boing","Record scratch","Swoosh hit","Glitch transition","Camera flash","Notification pop","Typing fast","Typing slow","Cash register","Coins drop","Magic spell","Fairy dust","Air sweep","Soft impact","Trailer braam","Orchestral hit","Tension pulse","Crowd gasp","Stadium chant","Clapping solo","Footsteps gravel","Footsteps wood","Car engine rev","Motorcycle pass","Police siren","Distant traffic","Rain on window","Forest birds","Wind gust","Ocean surf","Fireplace","Comedy sting","Suspense sting","Sci-fi ambience","Space whoosh","Robot servo","UI hover","UI confirm","UI error","Bubble pop","Water drip","Glass clink","Metal clang","Door creak","Zipper","Page flip","Paper tear","Whistle","Phone vibration","Alarm clock","Tape stop","Vinyl stop","Reverse cymbal","Cymbal crash","Snare roll","808 drop","Kick punch","Snare snap","Clap hit","Finger snap","Shaker loop","Tambourine hit","Crowd laugh","Dog bark","Cat meow","Train pass","Airplane flyby","Thunder crack","Deep rumble","Soft chime","Angel choir","Church bell","African percussion hit","Talking drum","Shekere shake","Afrobeat percussion fill"] as const;
const MUSIC_CATEGORIES = ["Afrobeats","Amapiano","Afropop","Afro-fusion","Gospel","Worship","Inspirational","Motivational","Cinematic","Epic trailer","Emotional piano","Sad piano","Romantic","Lo-fi hip hop","Chill beats","Study beats","Vlog background","Lifestyle vlog","Travel vlog","Fashion beat","Beauty tutorial","Product showcase","Corporate","Technology","Podcast intro","YouTube intro","TikTok edit","Instagram Reels","Shorts background","Trending dance","Dance pop","House","Deep house","Electronic","EDM","Phonk","Drill instrumental","Trap instrumental","Hip hop instrumental","R&B instrumental","Jazz lounge","Soul","Acoustic guitar","Piano instrumental","Orchestral","Ambient","Nature ambience","Comedy background","Suspense","Gaming","Retro 8-bit","Funky groove","Summer vibe","Feel-good pop","Minimal background","Luxury lifestyle","Sports hype","Workout energy","African highlife","Afro-soul","Talking drum groove","Percussion loop","Marimba groove"] as const;
const FILTER_PRESETS = ["Original","Cinematic","Vintage","Warm","Cool","B&W","Noir","Matte","Fade","Film Grain","Golden","Arctic","Dream","Vivid","Teal Orange","Soft Glow","Sepia","Retro 70s","Retro 90s","Kodachrome","Portra","Ektar","Fuji Film","Polaroid","Bleach Bypass","Cross Process","Moody","Dark Drama","Bright Day","Pastel","Rose","Lavender","Mint","Ocean Blue","Sunset","Autumn","Winter","Spring","Summer","Neon","Cyberpunk","Monochrome Blue","Monochrome Red","High Contrast","Low Contrast","Soft Portrait","Skin Warmth","Desaturated","Rich Color","Night", ...CREATIVE_FILTERS.map(item => item.name)];
const FILTER_CSS: Record<string, string> = { ...CREATIVE_FILTER_CSS, "Original":"none","Cinematic":"contrast(1.16) saturate(1.18)","Vintage":"sepia(.42) contrast(1.04)","Warm":"sepia(.18) saturate(1.28)","Cool":"hue-rotate(12deg) saturate(.9)","B&W":"grayscale(1)","Noir":"grayscale(1) contrast(1.35)","Matte":"contrast(.88) saturate(.82) brightness(1.08)","Fade":"contrast(.88) saturate(.82) brightness(1.08)","Film Grain":"contrast(1.08) saturate(.88)","Golden":"sepia(.18) saturate(1.28)","Arctic":"hue-rotate(12deg) saturate(.9)","Dream":"brightness(1.08) saturate(1.12)","Vivid":"saturate(1.45) contrast(1.08)","Teal Orange":"contrast(1.16) saturate(1.18)","Soft Glow":"brightness(1.08) saturate(1.12)","Sepia":"sepia(.65)","Retro 70s":"sepia(.3) saturate(1.2)","Retro 90s":"sepia(.18) contrast(1.12)","Kodachrome":"sepia(.25) saturate(1.25) contrast(1.08)","Portra":"saturate(1.35) contrast(1.05)","Ektar":"saturate(1.5) contrast(1.1)","Fuji Film":"hue-rotate(-8deg) saturate(1.1)","Polaroid":"sepia(.25) saturate(1.3) brightness(1.05)","Bleach Bypass":"grayscale(1) contrast(1.2)","Cross Process":"hue-rotate(25deg) saturate(1.25)","Moody":"contrast(1.18) saturate(.85)","Dark Drama":"brightness(.86) contrast(1.25)","Bright Day":"brightness(1.12) saturate(1.08)","Pastel":"saturate(.75) brightness(1.06)","Rose":"sepia(.12) hue-rotate(-12deg) saturate(1.15)","Lavender":"hue-rotate(18deg) saturate(.9)","Mint":"hue-rotate(70deg) saturate(.8)","Ocean Blue":"hue-rotate(165deg) saturate(1.15)","Sunset":"sepia(.22) saturate(1.45)","Autumn":"sepia(.32) saturate(1.1)","Winter":"hue-rotate(190deg) saturate(.85)","Spring":"hue-rotate(-25deg) saturate(1.15)","Summer":"sepia(.12) saturate(1.25) brightness(1.08)","Neon":"saturate(1.5) hue-rotate(-8deg)","Cyberpunk":"hue-rotate(145deg) saturate(1.5) contrast(1.12)","Monochrome Blue":"hue-rotate(185deg) saturate(1.4) contrast(1.1)","Monochrome Red":"grayscale(1) sepia(.25)","High Contrast":"grayscale(1) sepia(.25) hue-rotate(300deg)","Low Contrast":"contrast(1.35) saturate(1.08)","Soft Portrait":"contrast(.92) brightness(1.04)","Skin Warmth":"contrast(.96) saturate(.9)","Desaturated":"sepia(.12) saturate(1.25)","Rich Color":"saturate(.65)","Night":"saturate(1.6) contrast(1.12)"};
const filterCss = (name?: string) => FILTER_CSS[name || "Original"] || "none";


import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Clapperboard,
  Cloud, Command, Compass, Film, Folder, FolderOpen, Grid2X2, HelpCircle,
  Home, Image as ImageIcon, Layers, Music2, Play, Plus, Search, Settings,
  SlidersHorizontal, Sparkles, Scissors, Trash2, Upload, WandSparkles, X,
  Volume2, Crop, Type, Captions, Sticker, ImagePlus, Gauge, Share2, CheckCircle2, RotateCcw, Palette, AudioLines
} from "lucide-react";
import type { ClipKeyframe, MediaAsset, TimelineClip, TimelineImageLayer, TimelineTextLayer, TimelineTrack } from "./types";
import { AudioAssetBrowser } from "./editor/AudioAssetBrowser";
import { detectSubjectKeyframes } from "./editor/subject-tracking";
import { searchWikimediaCommons, type SourcedMediaResult } from "./editor/media-sourcing";
import { analyzeMediaAsset, buildTextCompositionLayers, getRenderCapabilities, interpretEditorCommand, makeEditingGuidance, verifyProject, type MediaAnalysis } from "./editor/engines";
import { clipDuration, clipSourceAtTimeline, clipTimelineAtSource, speedAtSourceProgress, defaultTracks, downloadProject, makeProject, parseProject, timelineDuration } from "./project";
import { detectEngineStack, trimClipAtPlayhead, moveClip, applyMediaElementGain, getGraphicsFallbackStyle } from "./editor/engine-runtime";
import { renderTimeline, getExportDimensions } from "./editor/browser-renderer";
import { getBrowserEngineHealth } from "./editor/engine-registry";
import { transcribeWhisper, transcribeVosk, transcribeOnline } from "./editor/transcription-engines";
import { askNexusDirector } from "./editor/ai-director";
import { createApostleQuotePosterLayers, getImageStylePreset, generateNexusWorkerImage } from "./editor/image-engine";
import { getChromaSvgMatrix } from "./editor/video-engine";
import { CREATIVE_FILTERS, CREATIVE_FILTER_CSS, CREATIVE_TEMPLATES, CREATIVE_EFFECTS } from "./editor/creative-library";
import { NEXUS_AUDIO_PRESETS, generateNexusAudio, type AudioPreset } from "./editor/audio-sfx";
import { extractAudioTrackFromVideo } from "./editor/audio-extraction";
import { interpretCreativeCommand } from "./editor/creative-brain";
import { detectReferenceWorkflow, buildReferenceContext } from "./editor/reference-workflow";
import { rankSceneAssets } from "./editor/scene-matching";
import { captureVisualSamples } from "./editor/visual-sampling";
import { checkNexusWorker, getEngineJob, getEngineStatus, submitEngineJob, loadSavedGenerationJobs, saveGenerationJobs, type NexusEngineJob, type NexusWorkerHealth } from "./editor/engine-jobs";
import { isNativeAndroid, pickNativeMediaFiles, saveExportOnAndroid, saveProjectOnAndroid, extractAudioNative, transcodeNativeVideo } from "./editor/native-android";

type Page = "home" | "editor" | "projects" | "templates" | "ai" | "settings";
const uid = () => crypto.randomUUID();
type EditorHistorySnapshot = { clips: TimelineClip[]; imageLayers: TimelineImageLayer[]; textLayers: TimelineTextLayer[]; tracks: TimelineTrack[] };
import { readRecoverableDraft, writeRecoverableDraft, type LocalDraft } from "./editor/project-recovery";
const readLocalDraft = readRecoverableDraft;
const themes = [
  { id: "violet", name: "Midnight Violet", colors: ["#a923ed", "#5d42ff", "#00bfe9"] },
  { id: "ocean", name: "Ocean Blue", colors: ["#168cff", "#2855e8", "#20d5e8"] },
  { id: "emerald", name: "Emerald Green", colors: ["#10b981", "#087f69", "#7ee6b7"] },
  { id: "sunset", name: "Sunset Orange", colors: ["#ff8a32", "#e34b38", "#ffc15c"] },
  { id: "rose", name: "Rose Pink", colors: ["#f04486", "#bd347d", "#ff9ab8"] },
  { id: "crimson", name: "Crimson Red", colors: ["#ef4444", "#b91c3c", "#ff8b73"] }
] as const;
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&apos;");
const clock = (n: number) => {
  const m = Math.floor(n / 60), s = Math.floor(n % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [recoveryDraft] = useState<LocalDraft | null>(() => readLocalDraft());
  const [draftSaveStatus, setDraftSaveStatus] = useState(recoveryDraft ? "Recovered draft · re-import media" : "Autosave ready");
  const [projectName, setProjectName] = useState(() => recoveryDraft?.projectName || "Untitled Project");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [pendingProjectAssets, setPendingProjectAssets] = useState<MediaAsset[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>(() => recoveryDraft?.clips || []);
  const [trackMix, setTrackMix] = useState<Record<string,{volume:number;pan:number;solo:boolean;muted:boolean}>>(() => Object.fromEntries((recoveryDraft?.tracks || []).filter(track=>track.kind==="audio").map(track=>[track.id,{volume:track.volume??1,pan:track.pan??0,solo:track.solo??false,muted:track.muted??false}])));
  const [trackStates, setTrackStates] = useState<TimelineTrack[]>(() => recoveryDraft?.tracks?.length ? recoveryDraft.tracks : defaultTracks.map(track => ({ ...track, locked: false })));
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const [textLayers, setTextLayers] = useState<TimelineTextLayer[]>(() => recoveryDraft?.textLayers || []);
  const [imageLayers, setImageLayers] = useState<TimelineImageLayer[]>(() => recoveryDraft?.imageLayers || []);
  const [selectedImageLayer, setSelectedImageLayer] = useState<string | null>(null);
  const [selectedImageAssetId, setSelectedImageAssetId] = useState("");
  const activeTrackStates = useMemo(() => trackStates.filter(track => track.id === "video-1" || clips.some(clip => clip.trackId === track.id) || (track.id === "text-1" && textLayers.length > 0) || (track.id === "image-1" && imageLayers.length > 0)), [trackStates, clips, textLayers.length, imageLayers.length]);
  const [selectedTextLayer, setSelectedTextLayer] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<EditorHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorHistorySnapshot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(60);
  const [status, setStatus] = useState("Your creative space is ready");
  const [editorTool, setEditorTool] = useState("Media");
  const [editorView, setEditorView] = useState("workspace");
  const [activeTool, setActiveTool] = useState("edit");
  const [activeSubtool, setActiveSubtool] = useState("select");
  const [effectSearch, setEffectSearch] = useState("");
  const [effectCategory, setEffectCategory] = useState("All");
  const [audioPresetCategory, setAudioPresetCategory] = useState("All");
  const [audioPresetSearch, setAudioPresetSearch] = useState("");
  const [audioGenerating, setAudioGenerating] = useState<string | null>(null);
  const generatedAudioPreviewUrl = useRef<string | null>(null);
  const generatedAudioElement = useRef<HTMLAudioElement | null>(null);
  const [overlayText, setOverlayText] = useState("Your text");
  const [compositionHeading, setCompositionHeading] = useState("YOUR MESSAGE");
  const [compositionBody, setCompositionBody] = useState("");
  const [compositionFooter, setCompositionFooter] = useState("");
  const [compositionDuration, setCompositionDuration] = useState(8);
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState("Arial");
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [muteClip, setMuteClip] = useState(false);
  const [clipGain, setClipGain] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(() => recoveryDraft?.aspectRatio || "9:16");
  const [exportQuality, setExportQuality] = useState("1080p");
  const [exportFps, setExportFps] = useState("30 FPS");
  const [exportPreset, setExportPreset] = useState("TikTok / Reels / Shorts");
  const [exportBusy, setExportBusy] = useState(false);
  const [masterOutputGain, setMasterOutputGain] = useState(0.9);
  const [exportProgress, setExportProgress] = useState(0);
  const exportAbortController = useRef<AbortController | null>(null);
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
  const [aiPlan, setAiPlan] = useState<null | { title: string; duration: number; scenes: { title: string; visual: string; narration: string; searchTerms: string[]; fallback: string; duration?: number }[]; sourcingNote: string }>(null);
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [mediaSearchResults, setMediaSearchResults] = useState<SourcedMediaResult[]>([]);
  const [mediaSearchStatus, setMediaSearchStatus] = useState("");
  const [mediaSearchBusy, setMediaSearchBusy] = useState(false);
  const [mediaAnalyses, setMediaAnalyses] = useState<MediaAnalysis[]>([]);
  const [beatMarkers, setBeatMarkers] = useState<{assetId:string;time:number}[]>([]);
  const [beatAnalysisBusy, setBeatAnalysisBusy] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [engineReport, setEngineReport] = useState<string[]>([]);
  const [transcriptionEngine, setTranscriptionEngine] = useState<"whisper" | "vosk" | "groq">("whisper");
  const [transcriptionStatus, setTranscriptionStatus] = useState("Choose an audio or video file from your media library.");
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionSegments, setTranscriptionSegments] = useState<{start:number;end:number;text:string}[]>([]);
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
  const [generationJobs, setGenerationJobs] = useState<(NexusEngineJob & { sceneTitle: string })[]>(() => loadSavedGenerationJobs());
  const [generationBusy, setGenerationBusy] = useState<string | null>(null);
  const [engineAvailability, setEngineAvailability] = useState<{brain:{configured:boolean;model?:string};engines:Record<string,{configured:boolean;provider:string;fallback:string}>} | null>(null);
  const [workerHealth, setWorkerHealth] = useState<NexusWorkerHealth | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("nexus-editor-theme") || "violet");
  function changeTheme(id: string) { setTheme(id); localStorage.setItem("nexus-editor-theme", id); }
  const mediaInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const touchClipDrag = useRef<{id:string;startX:number;startedAt:number;grabOffset:number} | null>(null);
  const trimClipDrag = useRef<{id:string;edge:"start"|"end";startX:number;clip:TimelineClip;allClips:TimelineClip[]} | null>(null);
  const timelineLayerDrag = useRef<{kind:"image"|"text";id:string;startX:number;originalStart:number;originalImages:TimelineImageLayer[];originalTexts:TimelineTextLayer[]} | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const audioPreview = useRef<HTMLAudioElement>(null);
  const aiWorker = useRef<Worker | null>(null);
  const voiceRecorder = useRef<MediaRecorder | null>(null);
  const voiceStream = useRef<MediaStream | null>(null);
  const voiceChunks = useRef<BlobPart[]>([]);
  const voiceElapsed = useRef(0);
  const voiceTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (voiceTimer.current !== null) window.clearInterval(voiceTimer.current);
    if (voiceRecorder.current && voiceRecorder.current.state !== "inactive") voiceRecorder.current.stop();
    voiceStream.current?.getTracks().forEach(track => track.stop());
  }, []);
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
  useEffect(() => { const controller = new AbortController(); getEngineStatus(controller.signal).then(setEngineAvailability).catch(() => setEngineAvailability(null)); checkNexusWorker(controller.signal).then(setWorkerHealth).catch(error => setWorkerHealth({ ok:false, status:"unavailable", message:error instanceof Error ? error.message : "Worker health check failed.", checkedAt:Date.now() })); return () => controller.abort(); }, []);
  useEffect(() => { saveGenerationJobs(generationJobs); }, [generationJobs]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const snapshot: LocalDraft = {
        version: 3, projectName, clips, textLayers, imageLayers,
        tracks: trackStates.map(track => ({ ...track, ...(trackMix[track.id] || {}) })),
        aspectRatio, savedAt: Date.now()
      };
      const saved = writeRecoverableDraft(snapshot);
      setDraftSaveStatus(saved
        ? "Autosaved · recovery backup kept on this device"
        : "Autosave storage is full · export a project backup");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [projectName, clips, textLayers, imageLayers, trackStates, trackMix, aspectRatio]);
  useEffect(() => {
    const pending = generationJobs.filter(job => !job.id.startsWith("unavailable-") && (job.state === "queued" || job.state === "running"));
    if (!pending.length) return;
    let active = true;
    const timer = window.setInterval(() => {
      if (!active) return;
      pending.forEach(job => { void refreshGenerationJob(job); });
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [generationJobs]);
  const selectedClip = clips.find(c => c.id === selected);
  const selectedClipForTools = selectedClip;
  const asset = assets.find(a => a.id === selectedClip?.assetId);
  const visualFilter = (clip?: TimelineClip) => { if (!clip) return "none"; const exposure = clip.exposure ?? 0, temperature = clip.temperature ?? 0, tint = clip.tint ?? 0, highlights = clip.highlights ?? 0, shadows = clip.shadows ?? 0; const brightness = Math.max(.2, Math.min(2.5, (clip.brightness ?? 100) / 100 * Math.pow(2, exposure) * (1 + shadows / 650 - highlights / 900))); const contrast = Math.max(.4, Math.min(2, (clip.contrast ?? 100) / 100 * (1 + highlights / 450 - shadows / 700))); return [filterCss(clip.filter), `brightness(${brightness})`, `contrast(${contrast})`, `saturate(${(clip.saturation ?? 100)/100})`, temperature ? `sepia(${Math.abs(temperature)/260})` : "", temperature ? `hue-rotate(${-temperature*.28}deg)` : "", tint ? `hue-rotate(${tint*.32}deg)` : ""].filter(Boolean).join(" "); };
  const visibleTextLayer = textLayers.filter(layer => playhead >= layer.start && playhead <= layer.start + layer.duration).sort((a,b)=>b.start-a.start)[0];
  const visibleTextLayers = textLayers.filter(layer => layer.visible !== false && playhead >= layer.start && playhead < layer.start + layer.duration && !trackStates.find(track=>track.id===layer.trackId)?.hidden);
  const duration = useMemo(() => Math.max(timelineDuration(clips), ...imageLayers.map(layer => layer.start + layer.duration), ...textLayers.map(layer => layer.start + layer.duration), 0), [clips, imageLayers, textLayers]);
  const hasExportableContent = clips.length > 0 || imageLayers.some(layer => layer.visible) || textLayers.some(layer => layer.visible !== false);
  const timelineWidth = Math.max(900, (duration + 15) * timelineZoom);
  const activeTimelineClips = clips.filter(clip => playhead >= clip.start && playhead < clip.start + clipDuration(clip)).sort((x,y)=>trackStates.findIndex(track=>track.id===x.trackId)-trackStates.findIndex(track=>track.id===y.trackId)||x.start-y.start);
  const previewClip = activeTimelineClips.filter(clip => assets.some(item => item.id === clip.assetId && item.kind !== "audio")).slice(-1)[0] || activeTimelineClips.slice(-1)[0];
  const previewAsset = assets.find(item => item.id === previewClip?.assetId);
  const getPreviewLayerMotion = (clip: TimelineClip) => {
    const base={zoom:clip.zoom??100,rotation:clip.rotation??0,offsetX:clip.offsetX??0,offsetY:clip.offsetY??0,opacity:clip.opacity??1};
    const frames=[...(clip.keyframes||[])].filter(frame=>Number.isFinite(frame.time)).sort((a,b)=>a.time-b.time);
    const local=Math.max(0,playhead-clip.start);
    let values=base;
    if(frames.length){
      if(local<=frames[0].time) values=frames[0];
      else if(local>=frames[frames.length-1].time) values=frames[frames.length-1];
      else {
        const index=frames.findIndex(frame=>frame.time>=local),left=frames[index-1],right=frames[index];
        const raw=Math.max(0,Math.min(1,(local-left.time)/Math.max(.0001,right.time-left.time)));
        const p=left.easing==="ease-in"?raw*raw:left.easing==="ease-out"?1-(1-raw)*(1-raw):left.easing==="ease-in-out"?(raw<.5?2*raw*raw:1-Math.pow(-2*raw+2,2)/2):raw;
        const mix=(a:number,b:number)=>a+(b-a)*p;
        values={zoom:mix(left.zoom,right.zoom),rotation:mix(left.rotation,right.rotation),offsetX:mix(left.offsetX,right.offsetX),offsetY:mix(left.offsetY,right.offsetY),opacity:mix(left.opacity,right.opacity)};
      }
    }
    const length=clipDuration(clip),tin=clip.transitionIn?Math.max(0,Math.min(1,local/clip.transitionIn)):1,tout=clip.transitionOut?Math.max(0,Math.min(1,(length-local)/clip.transitionOut)):1;
    const progress=Math.min(tin,tout),style=clip.transitionStyle||"fade";
    return {...values,alpha:style==="fade"?progress:1,blur:style==="blur"?(1-progress)*12:0,slide:style==="slide"?(1-tin)*16-(1-tout)*16:0,zoomBoost:style==="zoom"?(0.82+0.18*tin)*(0.82+0.18*tout):1,wipe:style==="wipe"?progress:1};
  };
  const previewAnimated = useMemo(() => {
    const base = { zoom: previewClip?.zoom ?? 100, rotation: previewClip?.rotation ?? 0, offsetX: previewClip?.offsetX ?? 0, offsetY: previewClip?.offsetY ?? 0, opacity: previewClip?.opacity ?? 1 };
    const frames = [...(previewClip?.keyframes || [])].filter(frame => Number.isFinite(frame.time)).sort((a,b)=>a.time-b.time);
    let values = base;
    if (frames.length && previewClip) {
      const local = Math.max(0, playhead - previewClip.start);
      if (local <= frames[0].time) values = frames[0];
      else if (local >= frames[frames.length-1].time) values = frames[frames.length-1];
      else {
        const rightIndex = frames.findIndex(frame=>frame.time>=local), left=frames[rightIndex-1], right=frames[rightIndex];
        const raw=Math.max(0,Math.min(1,(local-left.time)/Math.max(.0001,right.time-left.time)));
        const p=left.easing==="ease-in"?raw*raw:left.easing==="ease-out"?1-(1-raw)*(1-raw):left.easing==="ease-in-out"?(raw<.5?2*raw*raw:1-Math.pow(-2*raw+2,2)/2):raw;
        const mix=(a:number,b:number)=>a+(b-a)*p;
        values={zoom:mix(left.zoom,right.zoom),rotation:mix(left.rotation,right.rotation),offsetX:mix(left.offsetX,right.offsetX),offsetY:mix(left.offsetY,right.offsetY),opacity:mix(left.opacity,right.opacity)};
      }
    }
    const local = previewClip ? Math.max(0,playhead-previewClip.start) : 0;
    const length = previewClip ? clipDuration(previewClip) : 0;
    const tin = previewClip?.transitionIn ? Math.max(0,Math.min(1,local/previewClip.transitionIn)) : 1;
    const tout = previewClip?.transitionOut ? Math.max(0,Math.min(1,(length-local)/previewClip.transitionOut)) : 1;
    const transition = Math.min(tin,tout), style=previewClip?.transitionStyle||"fade";
    return { ...values, transitionAlpha:style==="fade"?transition:1, transitionBlur:style==="blur"?(1-transition)*12:0, wipe:style==="wipe"?transition:1, slide:style==="slide"?(1-tin)*16-(1-tout)*16:0, zoomBoost:style==="zoom"?(0.82+0.18*tin)*(0.82+0.18*tout):1 };
  }, [previewClip, playhead]);
  useEffect(() => {
    const viewport = timelineScrollRef.current;
    if (!viewport) return;
    const marker = playhead * timelineZoom;
    if (marker > viewport.scrollLeft + viewport.clientWidth - 70) viewport.scrollTo({ left: Math.max(0, marker - viewport.clientWidth * .65), behavior: "auto" });
    else if (marker < viewport.scrollLeft + 55) viewport.scrollTo({ left: Math.max(0, marker - 55), behavior: "auto" });
  }, [playhead, timelineZoom]);
  useEffect(() => {
    const element = video.current;
    if (!element || previewAsset?.kind !== "video" || !previewClip) return;
    const local = Math.max(0, playhead - previewClip.start);
    const target = clipSourceAtTimeline(previewClip, local);
    const playbackRate = speedAtSourceProgress(previewClip, (target - previewClip.sourceIn) / Math.max(.001, previewClip.sourceOut - previewClip.sourceIn));
    if (Math.abs(element.playbackRate - playbackRate) > .01) element.playbackRate = playbackRate;
    if (Math.abs(element.currentTime - target) > .2) { try { element.currentTime = target; } catch {} }
  }, [playhead, previewClip?.id, previewClip?.sourceIn, previewClip?.speed, previewAsset?.kind]);
  const engineStack = useMemo(() => detectEngineStack(), []);
  const project = { ...makeProject(projectName), clips, textLayers, imageLayers, tracks: activeTrackStates.map(track=>({...track,...(trackMix[track.id]||{})})), assets: assets.map(({ file, objectUrl, ...a }) => a) };
  useEffect(() => {
    const element = asset?.kind === "audio" ? audioPreview.current : video.current;
    if (!element || !selectedClip) return;
    const updateGain = () => {
      const sourceProgress = (element.currentTime - selectedClip.sourceIn) / Math.max(.001, selectedClip.sourceOut - selectedClip.sourceIn);
      const playbackRate = speedAtSourceProgress(selectedClip, sourceProgress);
      if (Math.abs(element.playbackRate - playbackRate) > .01) element.playbackRate = playbackRate;
      const localTime = clipTimelineAtSource(selectedClip, element.currentTime);
      const remaining = Math.max(0, clipDuration(selectedClip) - localTime);
      const fadeIn = selectedClip.fadeIn ? Math.min(1, localTime / selectedClip.fadeIn) : 1;
      const fadeOut = selectedClip.fadeOut ? Math.min(1, remaining / selectedClip.fadeOut) : 1;
      const bus = trackMix[selectedClip.trackId];
      const track = trackStates.find(item => item.id === selectedClip.trackId);
      const anotherBusSoloed = Object.entries(trackMix).some(([id, mix]) => id !== selectedClip.trackId && mix.solo);
      const silenced = selectedClip.muted || muteClip || track?.muted || track?.hidden || bus?.muted || (anotherBusSoloed && !bus?.solo);
      const gain = silenced ? 0 : (selectedClip.gain ?? clipGain) * (bus?.volume ?? 1) * Math.max(0, Math.min(fadeIn, fadeOut));
      applyMediaElementGain(element, gain);
    };
    element.addEventListener("timeupdate", updateGain); updateGain();
    return () => element.removeEventListener("timeupdate", updateGain);
  }, [asset?.kind, selectedClip?.id, selectedClip?.trackId, selectedClip?.gain, selectedClip?.muted, selectedClip?.fadeIn, selectedClip?.fadeOut, selectedClip?.sourceIn, selectedClip?.sourceOut, clipGain, muteClip, trackMix, trackStates]);
  useEffect(() => {
    aiWorker.current?.postMessage({ type: "context", payload: { projectName, clipCount: clips.length, assetCount: assets.length, selectedClip: selectedClip ? { id: selectedClip.id, label: selectedClip.label, trackId: selectedClip.trackId, start: selectedClip.start, sourceIn: selectedClip.sourceIn, sourceOut: selectedClip.sourceOut } : null, activeTool, activeSubtool, playhead, aspectRatio } });
  }, [projectName, clips, assets.length, selectedClip?.id, selectedClip?.label, selectedClip?.trackId, selectedClip?.start, selectedClip?.sourceIn, selectedClip?.sourceOut, activeTool, activeSubtool, playhead, aspectRatio]);

  function snapTimelineTime(value: number, excludeId?: string) {
    const fps = Math.max(1, Number.parseInt(exportFps, 10) || 30);
    const frameTime = Math.round(Math.max(0, value) * fps) / fps;
    const candidates = [0, playhead, ...clips.filter(item => item.id !== excludeId).flatMap(item => [item.start, item.start + clipDuration(item)])];
    const nearest = candidates.reduce((best, point) => Math.abs(point - frameTime) < Math.abs(best - frameTime) ? point : best, frameTime);
    return Math.max(0, Math.abs(nearest - frameTime) <= 0.12 ? nearest : frameTime);
  }
  function captureProjectSnapshot(): EditorHistorySnapshot {
    return { clips: [...clips], imageLayers: [...imageLayers], textLayers: [...textLayers], tracks: [...trackStates] };
  }
  function recordProjectHistory() {
    setUndoStack(old => [...old.slice(-49), captureProjectSnapshot()]);
    setRedoStack([]);
  }
  function applyClipChange(next: TimelineClip[], message: string) {
    recordProjectHistory();
    setClips(next);
    setStatus(message);
  }
  function restoreProjectSnapshot(snapshot: EditorHistorySnapshot) {
    setClips(snapshot.clips);
    setImageLayers(snapshot.imageLayers);
    setTextLayers(snapshot.textLayers);
    setTrackStates(snapshot.tracks);
    setSelected(snapshot.clips.some(c => c.id === selected) ? selected : snapshot.clips[snapshot.clips.length - 1]?.id || null);
    setSelectedImageLayer(snapshot.imageLayers.some(layer => layer.id === selectedImageLayer) ? selectedImageLayer : null);
    setSelectedTextLayer(snapshot.textLayers.some(layer => layer.id === selectedTextLayer) ? selectedTextLayer : null);
  }
  function undoEdit() {
    if (!undoStack.length) { setStatus("Nothing to undo yet."); return; }
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(old => [...old, captureProjectSnapshot()]);
    setUndoStack(old => old.slice(0, -1));
    restoreProjectSnapshot(previous);
    setStatus("Undo complete · project layers restored");
  }
  function redoEdit() {
    if (!redoStack.length) { setStatus("Nothing to redo yet."); return; }
    const next = redoStack[redoStack.length - 1];
    setUndoStack(old => [...old, captureProjectSnapshot()]);
    setRedoStack(old => old.slice(0, -1));
    restoreProjectSnapshot(next);
    setStatus("Redo complete · project layers restored");
  }
  useEffect(() => {
    const onEditorShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoEdit(); else undoEdit();
        return;
      }
      if (command && event.key.toLowerCase() === "y") {
        event.preventDefault(); redoEdit(); return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && page === "editor") {
        if (selectedImageLayer) {
          event.preventDefault();
          recordProjectHistory();
          setImageLayers(old => old.filter(layer => layer.id !== selectedImageLayer));
          setSelectedImageLayer(null);
          setStatus("Selected image layer deleted. Use Undo to restore it.");
          return;
        }
        if (selectedTextLayer) {
          event.preventDefault();
          recordProjectHistory();
          setTextLayers(old => old.filter(layer => layer.id !== selectedTextLayer));
          setSelectedTextLayer(null);
          setStatus("Selected text layer deleted. Use Undo to restore it.");
          return;
        }
        if (selected) {
          event.preventDefault();
          applyClipChange(clips.filter(clip => clip.id !== selected), "Selected clip deleted. Use Undo to restore it.");
          setSelected(null);
        }
      }
    };
    window.addEventListener("keydown", onEditorShortcut);
    return () => window.removeEventListener("keydown", onEditorShortcut);
  }, [page, selected, selectedImageLayer, selectedTextLayer, clips, imageLayers, textLayers, undoStack, redoStack]);
  async function openNativeMediaPicker(types: string[], fallback: { current: HTMLInputElement | null }) {
    if (!isNativeAndroid()) { fallback.current?.click(); return; }
    try {
      setStatus("Opening Android media picker…");
      const picked = await pickNativeMediaFiles(types);
      importMedia(picked);
      setEditorView("workspace"); setShowAttachmentPicker(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Android could not open the selected media.");
    }
  }
  function importMedia(files: FileList | File[] | null) {
    if (!files) return;
    const remaining = [...pendingProjectAssets];
    const added: MediaAsset[] = Array.from(files).filter(f => /^(video|audio|image)\//.test(f.type)).map(file => {
      const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      const matchIndex = remaining.findIndex(item => item.name === file.name && item.kind === kind);
      const saved = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : undefined;
      return {
        ...(saved || {}),
        id: saved?.id || uid(), name: file.name, kind,
        duration: saved?.duration || (kind === "image" ? 5 : 0), mimeType: file.type,
        file, objectUrl: URL.createObjectURL(file)
      } as MediaAsset;
    });
    setPendingProjectAssets(remaining);
    setAssets(old => [...old.filter(existing => !added.some(item => item.id === existing.id)), ...added]);
    added.forEach(a => {
      if (a.kind !== "image") {
        const probe = document.createElement(a.kind);
        probe.preload = "metadata"; probe.src = a.objectUrl!;
        probe.onloadedmetadata = () => setAssets(old => old.map(x => x.id === a.id ? { ...x, duration: Number.isFinite(probe.duration) ? probe.duration : 5 } : x));
      }
    });
    if (pendingProjectAssets.length) {
      const linked = added.filter(item => pendingProjectAssets.some(saved => saved.id === item.id)).length;
      setStatus(remaining.length ? linked + " project media file(s) relinked · " + remaining.length + " still needed" : "All project media relinked · your timeline is ready");
    } else {
      setStatus(added.length + " media file(s) imported");
    }
  }
  async function extractSelectedVideoAudio() {
    if (extractingAudio) return;
    if (!selectedClip || !asset || asset.kind !== "video" || !asset.file) {
      setStatus("Select an imported video clip with its original file available before extracting audio.");
      return;
    }
    const sourceStart = Math.max(0, selectedClip.sourceIn);
    const sourceEnd = Math.min(asset.duration || selectedClip.sourceOut, selectedClip.sourceOut);
    if (!(sourceEnd > sourceStart)) { setStatus("The selected video clip has no valid audio range to extract."); return; }
    setExtractingAudio(true);
    setStatus(isNativeAndroid() ? "Extracting audio with Android MediaExtractor…" : "Extracting audio with browser media capture…");
    try {
      const extracted = isNativeAndroid() ? await extractAudioNative(asset.file, sourceStart, sourceEnd) : await extractAudioTrackFromVideo(asset.file, sourceStart, sourceEnd);
      const objectUrl = URL.createObjectURL(extracted);
      const created: MediaAsset = { id: uid(), name: asset.name.replace(/\\.[^.]+$/, "") + (extracted.type === "audio/mp4" ? "-audio-extract.m4a" : "-audio-extract.webm"), kind: "audio", duration: sourceEnd - sourceStart, mimeType: extracted.type || "audio/webm", file: extracted, objectUrl, source: { type: "personal", attribution: "Audio extracted from " + asset.name } };
      setAssets(old => [...old, created]);
      const audioTrackIds = ["audio-1", "audio-2", "audio-3", "audio-4"];
      const used = new Set(clips.filter(item => assets.find(media => media.id === item.assetId)?.kind === "audio").map(item => item.trackId));
      const trackId = audioTrackIds.find(id => !used.has(id)) || audioTrackIds[clips.filter(item => item.trackId.startsWith("audio-")).length % audioTrackIds.length];
      const clip: TimelineClip = { id: uid(), assetId: created.id, trackId, start: selectedClip.start, sourceIn: 0, sourceOut: created.duration, label: created.name, gain: 1, muted: false, fadeIn: 0, fadeOut: 0, speed: 1 };
      applyClipChange([...clips, clip], "Audio extracted and added beneath the selected video clip.");
      setSelected(clip.id); setPlayhead(clip.start); setActiveTool("audio"); setActiveSubtool("mixer");
      setStatus("Audio extracted and added to the timeline. It starts with the selected video segment; adjust its speed if the video clip uses a speed ramp.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Audio extraction failed. The original video and project remain unchanged.");
    } finally { setExtractingAudio(false); }
  }
  async function addDownloadedAudio(file: File, source: { pageUrl: string; creator: string; license: string; licenseUrl: string; attribution: string }) {
    const objectUrl = URL.createObjectURL(file);
    const created: MediaAsset = { id: uid(), name: file.name, kind: "audio", duration: 0, mimeType: file.type || "audio/mpeg", file, objectUrl, source: { type: "commons", ...source } };
    setAssets(old => [...old, created]);
    const probe = document.createElement("audio");
    probe.preload = "metadata"; probe.src = objectUrl;
    const mediaDuration = await new Promise<number>(resolve => {
      const timer = window.setTimeout(() => resolve(0), 10000);
      probe.onloadedmetadata = () => { window.clearTimeout(timer); resolve(Number.isFinite(probe.duration) ? probe.duration : 0); };
      probe.onerror = () => { window.clearTimeout(timer); resolve(0); };
    });
    const finalAsset = { ...created, duration: mediaDuration || 5 };
    setAssets(old => old.map(item => item.id === created.id ? finalAsset : item));
    const audioTrackIds = ["audio-1", "audio-2", "audio-3", "audio-4"];
    const usedAudioTracks = new Set(clips.filter(item => assets.find(media => media.id === item.assetId)?.kind === "audio").map(item => item.trackId));
    const trackId = audioTrackIds.find(id => !usedAudioTracks.has(id)) || audioTrackIds[clips.filter(item => item.trackId.startsWith("audio-")).length % audioTrackIds.length];
    const clip: TimelineClip = { id: uid(), assetId: created.id, trackId, start: Math.max(0, playhead), sourceIn: 0, sourceOut: finalAsset.duration, label: created.name, gain: 1, muted: false, fadeIn: 0, fadeOut: 0, speed: 1 };
    applyClipChange([...clips, clip], "Licensed audio downloaded and added to your timeline.");
    setSelected(clip.id); setPlayhead(clip.start); setPage("editor"); setActiveTool("audio"); setActiveSubtool("sounds");
    if (audioPreview.current) audioPreview.current.src = objectUrl;
  }
  async function previewGeneratedAudio(preset: AudioPreset) {
    try {
      setAudioGenerating("preview:" + preset.name);
      const blob = await generateNexusAudio(preset);
      if (generatedAudioPreviewUrl.current) URL.revokeObjectURL(generatedAudioPreviewUrl.current);
      const url = URL.createObjectURL(blob); generatedAudioPreviewUrl.current = url;
      const player = generatedAudioElement.current || new Audio();
      generatedAudioElement.current = player; player.pause(); player.src = url; player.currentTime = 0;
      await player.play();
      setStatus("Previewing original NEXUS sound: " + preset.name);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not generate this audio preview."); }
    finally { setAudioGenerating(null); }
  }
  async function addGeneratedAudio(preset: AudioPreset) {
    try {
      setAudioGenerating(preset.name);
      const blob = await generateNexusAudio(preset);
      const safeName = preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const file = new File([blob], "nexus-" + safeName + ".wav", { type: "audio/wav" });
      const objectUrl = URL.createObjectURL(file);
      const created: MediaAsset = { id: uid(), name: file.name, kind: "audio", duration: preset.duration, mimeType: "audio/wav", file, objectUrl, source: { type: "generated", attribution: "Original audio synthesised by NEXUS Studio" } };
      const audioTrackIds = ["audio-1", "audio-2", "audio-3", "audio-4"];
      const used = new Set(clips.filter(item => assets.find(media => media.id === item.assetId)?.kind === "audio").map(item => item.trackId));
      const trackId = audioTrackIds.find(id => !used.has(id)) || audioTrackIds[clips.filter(item => item.trackId.startsWith("audio-")).length % audioTrackIds.length];
      const clip: TimelineClip = { id: uid(), assetId: created.id, trackId, start: Math.max(0, playhead), sourceIn: 0, sourceOut: preset.duration, label: preset.name, gain: 1, muted: false, fadeIn: .08, fadeOut: .2, speed: 1 };
      setAssets(old => [...old, created]); applyClipChange([...clips, clip], "Original NEXUS audio added to the timeline: " + preset.name);
      setSelected(clip.id); setPlayhead(clip.start); setPage("editor"); setActiveTool("audio"); setActiveSubtool("mixer");
      setStatus(preset.kind === "music" ? "Original generated music bed added. Duplicate it to cover a longer edit." : "Original generated sound effect added to the audio timeline.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Audio generation failed. You can still import licensed audio files."); }
    finally { setAudioGenerating(null); }
  }
  function add(a: MediaAsset) {
    const audioTrackIds = ["audio-1", "audio-2", "audio-3", "audio-4"];
    const usedAudioTracks = new Set(clips.filter(item => assets.find(media => media.id === item.assetId)?.kind === "audio").map(item => item.trackId));
    const audioTrackId = audioTrackIds.find(id => !usedAudioTracks.has(id)) || audioTrackIds[clips.filter(item => item.trackId.startsWith("audio-")).length % audioTrackIds.length];
    const c: TimelineClip = { id: uid(), assetId: a.id, trackId: a.kind === "audio" ? audioTrackId : "video-1", start: a.kind === "audio" ? playhead : timelineDuration(clips), sourceIn: 0, sourceOut: a.duration || 5, label: a.name, gain: 1, muted: false, fadeIn: 0, fadeOut: 0, speed: 1 };
    applyClipChange([...clips, c], "Added to timeline"); setSelected(c.id); setPlayhead(c.start);
    if (a.kind === "video" && video.current) video.current.src = a.objectUrl!;
    if (a.kind === "audio" && audioPreview.current) audioPreview.current.src = a.objectUrl!;
    setPage("editor");
  }
  function trimSelectedAtPlayhead() {
    if (!selectedClip) return;
    const trimmed = trimClipAtPlayhead(selectedClip, playhead);
    if (!trimmed) { setStatus("Move the playhead inside the selected clip before trimming its end."); return; }
    applyClipChange(clips.map(c => c.id === selectedClip.id ? trimmed : c), "Trim applied to selected clip. Undo is available.");
  }
  function nudgeSelectedClip(delta: number) {
    if (!selectedClip) return;
    const moved = moveClip(clips, selectedClip.id, delta);
    applyClipChange(moved, "Selected clip moved " + (delta < 0 ? "earlier" : "later") + " on the timeline.");
  }
  function addImageLayer() {
    const source = assets.find(item => item.id === selectedImageAssetId && item.kind === "image");
    if (!source) { setStatus("Choose an imported image first."); return; }
    recordProjectHistory();
    const layer: TimelineImageLayer = { id: uid(), assetId: source.id, trackId: "image-1", start: playhead, duration: 5, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, visible: true, locked: false, fit: "contain" };
    setImageLayers(old => [...old, layer]); setSelectedImageLayer(layer.id); setStatus(source.name + " added as an independent image/sticker layer.");
  }
  function reorderSelectedImageLayer(direction: -1 | 1) {
    if (!selectedImageLayer) return;
    recordProjectHistory();
    setImageLayers(old => { const index=old.findIndex(layer=>layer.id===selectedImageLayer), target=index+direction; if(index<0||target<0||target>=old.length)return old; const next=[...old]; [next[index],next[target]]=[next[target],next[index]]; return next; });
  }
  function updateSelectedImageLayer(patch: Partial<TimelineImageLayer>) {
    if (!selectedImageLayer) return;
    // Position/scale/rotation/opacity sliders update continuously; discrete layer
    // operations must always create a history entry so Undo restores visibility,
    // lock state, fit mode, timing and track changes as well.
    if (Object.keys(patch).some(key => !["x","y","scale","rotation","opacity"].includes(key))) recordProjectHistory();
    setImageLayers(old => old.map(layer => layer.id === selectedImageLayer ? { ...layer, ...patch } : layer));
  }
  async function generateImageIntoProject(prompt: string, sceneTitle: string, targetLayerId?: string, targetClipId?: string, historyClips?: TimelineClip[]) {
    const targetLayer = targetLayerId ? imageLayers.find(layer => layer.id === targetLayerId) : undefined;
    if (targetLayerId && (!targetLayer || targetLayer.locked)) throw new Error("The selected image layer is missing or locked.");
    const generated = await generateNexusWorkerImage(prompt);
    const response = await fetch(generated.image);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > 10 * 1024 * 1024) throw new Error("The generated image is invalid or larger than the editor's 10 MB import limit.");
    const extension = blob.type.includes("webp") ? "webp" : blob.type.includes("jpeg") ? "jpg" : "png";
    const file = new File([blob], (sceneTitle || "NEXUS generated image").replace(/[^a-z0-9-_ ]/gi, "").slice(0, 70) + "." + extension, { type: blob.type });
    const objectUrl = URL.createObjectURL(file);
    const created: MediaAsset = {
      id: uid(), name: file.name, kind: "image", duration: 5, mimeType: file.type, file, objectUrl,
      source: { type: "generated", pageUrl: "nexus-worker:" + generated.model + ":" + Date.now(), creator: "NEXUS Cloudflare Workers AI" }
    };
    if (targetLayer) {
      recordProjectHistory();
      setAssets(old => [...old, created]);
      setImageLayers(old => old.map(layer => layer.id === targetLayer.id ? { ...layer, assetId: created.id, generationPrompt: prompt, generationJobId: "cloudflare-sync" } : layer));
      setSelectedImageLayer(targetLayer.id);
      setAiReply("Generated image imported and replaced the selected layer. Its timing, position, scale, opacity and stacking settings were preserved.");
      return created;
    }
    if (targetClipId) {
      setUndoStack(old => [...old.slice(-49), { ...captureProjectSnapshot(), clips: historyClips || clips }]);
      setRedoStack([]);
      setAssets(old => [...old, created]);
      setClips(old => old.map(clip => clip.id === targetClipId ? { ...clip, assetId: created.id, sourceIn: 0, sourceOut: Math.max(0.5, clip.sourceOut), label: sceneTitle + " · AI generated", aiScene: clip.aiScene ? { ...clip.aiScene, sourceType: "generated" } : undefined } : clip));
      setSelected(targetClipId);
      setAiReply("Generated image imported and automatically replaced its matching storyboard placeholder.");
      return created;
    }
    setAssets(old => [...old, created]);
    const isBackground = /background|backdrop|wallpaper/i.test(sceneTitle + " " + prompt);
    if (isBackground) {
      recordProjectHistory();
      const background: TimelineImageLayer = {
        id: uid(), assetId: created.id, trackId: "image-1", start: Math.max(0, playhead),
        duration: Math.max(5, selectedClip ? selectedClip.start + clipDuration(selectedClip) - playhead : duration - playhead),
        x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, visible: true, locked: false, fit: "cover",
        generationPrompt: prompt, generationJobId: "cloudflare-sync"
      };
      setImageLayers(old => [...old, background]);
      setSelectedImageLayer(background.id);
      setAiReply("Generated background imported into the media library and added as a full-frame image layer. You can adjust it on the Images & Stickers track.");
    } else {
      const clip: TimelineClip = { id: uid(), assetId: created.id, trackId: "video-1", start: Math.max(0, playhead), sourceIn: 0, sourceOut: 5, label: created.name, gain: 1, muted: false };
      applyClipChange([...clips, clip], "Generated image imported and added to the timeline.");
      setSelected(clip.id); setPlayhead(clip.start);
      setAiReply("Generated image imported into your media library and added to the timeline.");
    }
    return created;
  }
  async function regenerateSelectedImageLayer() {
    const layer = imageLayers.find(item => item.id === selectedImageLayer);
    if (!layer) { setAiReply("Select an image or background layer first."); return; }
    if (layer.locked) { setAiReply("Unlock this image layer before replacing it."); return; }
    const source = assets.find(item => item.id === layer.assetId);
    const prompt = aiBrief.trim() || ("Create a fresh visual replacement for the project image layer " + (source?.name || "selected image") + ". Preserve its role and composition in " + projectName + ". No text, captions, logos or watermarks.");
    setGenerationBusy("image:replace:" + layer.id);
    setAiReply("Generating a replacement image with the connected NEXUS image model…");
    try {
      await generateImageIntoProject(prompt, "Project background · Replace " + layer.id, layer.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation worker unavailable.";
      setAiReply(message + " The selected image layer was not changed.");
    } finally { setGenerationBusy(null); }
  }
  function addGraphicLayer(value: string, color = "#ffffff", backgroundColor = "transparent") { const layer: TimelineTextLayer = { id: uid(), trackId: "text-1", start: playhead, duration: 5, text: value, color, fontSize: 64, fontFamily: "Arial", x: 50, y: 50, backgroundColor, padding: 12, align: "center", shadow: true }; recordProjectHistory(); setTextLayers(old => [...old, layer]); setSelectedTextLayer(layer.id); setOverlayText(value); setTextColor(color); setTextSize(64); setActiveTool("text"); setStatus("Graphic or sticker layer added to the timeline."); }
  function addApostleQuotePoster() {
    const quote = compositionBody.trim();
    if (!quote) { setStatus("Enter the quote text before creating the poster."); return; }
    const layers = createApostleQuotePosterLayers({ quote, attribution: compositionFooter.trim() || "Apostle Richman Daniel", start: playhead, duration: compositionDuration, makeId: uid });
    recordProjectHistory();
    setTextLayers(old => [...old, ...layers]);
    const main = layers.find(layer => layer.text === quote.slice(0, 700)) || layers[0];
    setSelectedTextLayer(main.id); setActiveTool("text"); setActiveSubtool("quote-poster");
    setStatus("Apostle Richman Daniel quote poster added as editable text layers. Add a photo or background to finish the design.");
  }
  function addTextCompositionLayout() {
    const bodyText = compositionBody.trim();
    if (!bodyText) { setStatus("Enter the main text before creating a composition."); return; }
    const layers = buildTextCompositionLayers({ heading: compositionHeading, body: bodyText, footer: compositionFooter, start: playhead, duration: compositionDuration, makeId: uid });
    const body = layers.find(layer => layer.text === bodyText.slice(0, 700)) || layers[0];
    recordProjectHistory();
    setTextLayers(old => [...old, ...layers]);
    setSelectedTextLayer(body.id);
    setActiveTool("text");
    setActiveSubtool("composition");
    setStatus("Text composition added as editable timeline layers. Add a background image or shape to complete the design.");
  }
  function addTextLayer(preset: "standard" | "title" | "lower-third" | "subtitle" = "standard") {
    const styles = { standard: {fontSize:textSize,color:textColor,fontFamily:textFont,x:50,y:50,align:"center" as const,backgroundColor:"transparent",padding:8,shadow:true,animation:"fade" as const}, title:{fontSize:76,color:"#ffffff",fontFamily:"Arial",x:50,y:38,align:"center" as const,backgroundColor:"transparent",padding:12,shadow:true,animation:"pop" as const}, "lower-third":{fontSize:38,color:"#ffffff",fontFamily:"Arial",x:50,y:78,align:"left" as const,backgroundColor:"#111827",padding:18,shadow:true,animation:"fade" as const}, subtitle:{fontSize:34,color:"#ffffff",fontFamily:"Arial",x:50,y:84,align:"center" as const,backgroundColor:"#111827",padding:10,shadow:true,animation:"fade" as const} };
    const style=styles[preset]; const layer: TimelineTextLayer = { id: uid(), trackId: "text-1", start: playhead, duration: 5, text: overlayText || (preset==="title"?"Your title":preset==="subtitle"?"Your subtitle":"Your text"), ...style };
    recordProjectHistory();
    setTextLayers(old => [...old, layer]); setSelectedTextLayer(layer.id); setActiveTool("text"); setStatus(preset+" text layer added to the timeline.");
  }
  function duplicateSelectedText() { const source=textLayers.find(layer=>layer.id===selectedTextLayer); if(!source)return; const copy={...source,id:uid(),start:source.start+source.duration}; recordProjectHistory(); setTextLayers(old=>[...old,copy]);setSelectedTextLayer(copy.id);setStatus("Text layer duplicated."); }
  function reorderSelectedText(direction: -1 | 1) {
    if (!selectedTextLayer) return;
    recordProjectHistory();
    setTextLayers(old => {
      const index = old.findIndex(layer => layer.id === selectedTextLayer);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= old.length) return old;
      const next = [...old]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
    setStatus(direction < 0 ? "Text layer moved backward in the stack." : "Text layer moved forward in the stack.");
  }
  function toggleSelectedTextVisibility() {
    const layer = textLayers.find(item => item.id === selectedTextLayer);
    if (!layer) return;
    updateSelectedText({ visible: layer.visible === false });
    setStatus(layer.visible === false ? "Text layer shown." : "Text layer hidden.");
  }
  function duplicateSelectedTextLayer() {
    const source = textLayers.find(layer => layer.id === selectedTextLayer);
    if (!source) return;
    const copy = { ...source, id: uid(), start: source.start + .25, locked: false };
    recordProjectHistory();
    setTextLayers(old => [...old, copy]); setSelectedTextLayer(copy.id);
    setStatus("Text layer duplicated.");
  }
  function updateSelectedText(patch: Partial<TimelineTextLayer>) {
    if (!selectedTextLayer) return;
    if (Object.keys(patch).some(key => !["x","y","fontSize","opacity","rotation"].includes(key))) recordProjectHistory();
    setTextLayers(old => old.map(layer => layer.id === selectedTextLayer ? { ...layer, ...patch } : layer));
  }
  function updateSelectedClip(patch: Partial<TimelineClip>) {
    if (!selectedClip) return; applyClipChange(clips.map(clip => clip.id === selectedClip.id ? { ...clip, ...patch } : clip), "Clip settings updated.");
  }
  async function runSubjectAssist(mode: "reframe" | "track") {
    if (!selectedClip || !asset || asset.kind !== "video" || !asset.objectUrl) { setStatus("Select an imported video clip first."); return; }
    setStatus(mode === "reframe" ? "Scanning frames to reframe the subject…" : "Tracking the subject across the clip…");
    try {
      const frames = await detectSubjectKeyframes(asset, selectedClip, mode);
      updateSelectedClip({ keyframes: frames });
      setStatus(mode === "reframe" ? "Auto-reframe applied. Review the subject framing across the clip." : "Subject motion tracking applied as editable keyframes.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Subject analysis could not run on this browser."); }
  }
  function applyMotionPreset(preset: "push-in" | "pan" | "fade-zoom") {
    if (!selectedClip) return;
    const length = Math.max(.25, clipDuration(selectedClip));
    const base: ClipKeyframe = { time: 0, zoom: selectedClip.zoom ?? 100, rotation: selectedClip.rotation ?? 0, offsetX: selectedClip.offsetX ?? 0, offsetY: selectedClip.offsetY ?? 0, opacity: selectedClip.opacity ?? 1, easing: "ease-in-out" };
    const end: ClipKeyframe = { ...base, time: length };
    if (preset === "push-in") { base.zoom = 100; end.zoom = 118; }
    if (preset === "pan") { base.offsetX = -12; end.offsetX = 12; }
    if (preset === "fade-zoom") { base.zoom = 92; base.opacity = 0; end.zoom = 100; end.opacity = 1; }
    applyClipChange(clips.map(clip => clip.id === selectedClip.id ? { ...clip, keyframes: [base, end] } : clip), preset === "push-in" ? "Smooth push-in motion added." : preset === "pan" ? "Horizontal pan animation added." : "Fade and zoom animation added.");
  }
  function addKeyframeAtPlayhead() {
    if (!selectedClip) return;
    const time = Math.max(0, Math.min(clipDuration(selectedClip), playhead - selectedClip.start));
    const current = getPreviewLayerMotion(selectedClip);
    const frame: ClipKeyframe = {
      time,
      zoom: current.zoom,
      rotation: current.rotation,
      offsetX: current.offsetX,
      offsetY: current.offsetY,
      opacity: current.opacity,
      easing: "ease-in-out"
    };
    const keyframes = [...(selectedClip.keyframes || []).filter(item => Math.abs(item.time - time) > 0.04), frame].sort((a, b) => a.time - b.time);
    applyClipChange(clips.map(clip => clip.id === selectedClip.id ? { ...clip, keyframes } : clip), "Motion keyframe saved at " + clock(time) + ".");
  }
  function removeNearestKeyframe() {
    if (!selectedClip) return;
    const time = Math.max(0, playhead - selectedClip.start);
    const frames = selectedClip.keyframes || [];
    if (!frames.length) { setStatus("This clip has no motion keyframes yet."); return; }
    const nearest = frames.reduce((best, frame) => Math.abs(frame.time - time) < Math.abs(best.time - time) ? frame : best, frames[0]);
    if (Math.abs(nearest.time - time) > 0.35) { setStatus("Move the playhead closer to a keyframe before removing it."); return; }
    applyClipChange(clips.map(clip => clip.id === selectedClip.id ? { ...clip, keyframes: frames.filter(frame => frame !== nearest) } : clip), "Motion keyframe removed.");
  }
  function split() {
    if (!selectedClip) return;
    const at = clipSourceAtTimeline(selectedClip, Math.max(0, playhead - selectedClip.start));
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
  async function runTranscription() {
    const source = asset;
    if (!source?.file || (source.kind !== "audio" && source.kind !== "video")) {
      setTranscriptionStatus("Select an imported audio or video clip first.");
      return;
    }
    setTranscriptionBusy(true); setTranscriptionText("");
    setTranscriptionStatus("Starting " + transcriptionEngine + " transcription…");
    try {
      const result = transcriptionEngine === "whisper"
        ? await transcribeWhisper(source.file, setTranscriptionStatus)
        : transcriptionEngine === "vosk"
          ? await transcribeVosk(source.file, setTranscriptionStatus)
          : await transcribeOnline(source.file);
      setTranscriptionText(result.text);
      setTranscriptionSegments(result.segments || []);
      setTranscriptionStatus(result.text ? "Transcription complete · " + result.engine.toUpperCase() : "No speech was detected. Try another engine or review the audio.");
    } catch (error) {
      setTranscriptionStatus(error instanceof Error ? error.message : "Transcription failed.");
    } finally { setTranscriptionBusy(false); }
  }
  function addTranscriptionCaptions() {
    const source = asset;
    if (!source || !transcriptionText.trim()) { setStatus("Transcribe an audio or video clip first."); return; }
    const parts = transcriptionSegments.length ? transcriptionSegments : [{ start: 0, end: Math.max(2, source.duration || 5), text: transcriptionText }];
    const usable = parts.filter(part => part.text.trim());
    const layers: TimelineTextLayer[] = usable.map((part, index) => ({
      id: uid(), trackId: "text-1", start: (selectedClip?.assetId === source.id ? selectedClip.start : 0) + Math.max(0, part.start) / Math.max(0.1, selectedClip?.assetId === source.id ? selectedClip.speed || 1 : 1),
      duration: Math.max(0.6, Math.min(8, ((part.end || part.start + 3) - part.start) / Math.max(0.1, selectedClip?.assetId === source.id ? selectedClip.speed || 1 : 1))),
      text: part.text.trim(), color: "#ffffff", fontSize: 38, fontFamily: "Arial",
      x: 50, y: 82, align: "center", shadow: true, animation: "fade"
    }));
    setTextLayers(old => [...old, ...layers]);
    setStatus("Added " + layers.length + " timed caption layers from the transcript.");
    setPage("editor"); setActiveTool("captions"); setActiveSubtool("Auto captions");
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
  async function startVoiceoverRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("Voice recording is not supported in this browser. Open NEXUS Studio in an updated Chrome browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      voiceStream.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceChunks.current = [];
      recorder.ondataavailable = event => { if (event.data.size) voiceChunks.current.push(event.data); };
      recorder.onstop = () => {
        if (voiceTimer.current !== null) window.clearInterval(voiceTimer.current);
        voiceTimer.current = null;
        stream.getTracks().forEach(track => track.stop());
        voiceStream.current = null;
        setVoiceRecording(false);
        const blob = new Blob(voiceChunks.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) { setStatus("No audio was captured. Check microphone permission and try again."); return; }
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], "NEXUS-Voiceover-" + new Date().toISOString().replace(/[:.]/g,"-") + "." + extension, { type: blob.type || "audio/webm" });
        const objectUrl = URL.createObjectURL(file);
        const probe = document.createElement("audio");
        probe.preload = "metadata";
        probe.src = objectUrl;
        const finish = (length: number) => {
          const finalDuration = Number.isFinite(length) && length > 0 ? length : Math.max(1, voiceElapsed.current);
          const created: MediaAsset = { id: uid(), name: file.name, kind: "audio", duration: finalDuration, mimeType: file.type, file, objectUrl, source: { type: "personal" } };
          const clip: TimelineClip = { id: uid(), assetId: created.id, trackId: "audio-4", start: Math.max(0, playhead), sourceIn: 0, sourceOut: finalDuration, label: "Voiceover · " + clock(finalDuration), gain: 1, muted: false, fadeIn: 0, fadeOut: 0, speed: 1 };
          setAssets(old => [...old, created]);
          applyClipChange([...clips, clip], "Voiceover recorded and added to the Voice track.");
          setSelected(clip.id);
          setPlayhead(clip.start);
          setPage("editor");
          setActiveTool("audio");
          setActiveSubtool("voiceover");
          setStatus("Voiceover added to the timeline. You can trim, process and mix it like any other audio clip.");
        };
        probe.onloadedmetadata = () => finish(probe.duration);
        probe.onerror = () => finish(0);
      };
      recorder.start(250);
      voiceRecorder.current = recorder;
      setVoiceRecordingSeconds(0);
      voiceElapsed.current = 0;
      setVoiceRecording(true);
      voiceTimer.current = window.setInterval(() => { voiceElapsed.current += 1; setVoiceRecordingSeconds(voiceElapsed.current); }, 1000);
      setStatus("Recording voiceover. Speak clearly; tap Stop recording when finished.");
    } catch (error) {
      voiceStream.current?.getTracks().forEach(track => track.stop());
      voiceStream.current = null;
      setStatus(error instanceof Error ? "Microphone unavailable: " + error.message : "Microphone permission was not granted.");
    }
  }
  function stopVoiceoverRecording() {
    if (voiceRecorder.current && voiceRecorder.current.state !== "inactive") {
      voiceRecorder.current.stop();
      voiceRecorder.current = null;
    }
  }
  async function detectSelectedAudioBeats() {
    const audioAsset = (selectedClip && assets.find(item => item.id === selectedClip.assetId && item.kind === "audio")) || assets.find(item => item.kind === "audio");
    if (!audioAsset) { setStatus("Import an audio file and select it, or add one to the project, before detecting beats."); return; }
    setBeatAnalysisBusy(true); setStatus("Analysing audio energy and locating beat candidates…");
    try {
      const result = await analyzeMediaAsset(audioAsset);
      const candidates = result.audio?.beatCandidates || [];
      const markers = candidates.filter(time => Number.isFinite(time) && time >= 0 && time <= (result.duration || audioAsset.duration)).map(time => ({assetId:audioAsset.id,time}));
      setBeatMarkers(old => [...old.filter(marker => marker.assetId !== audioAsset.id), ...markers]);
      setMediaAnalyses(old => [...old.filter(item => item.assetId !== audioAsset.id), result]);
      setStatus(markers.length ? "Detected " + markers.length + " audio beat/transient candidates. Tap a marker to move the playhead and edit to the rhythm." : "No strong beat candidates found. Try a clearer or more rhythmic audio file.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Audio beat analysis failed.");
    } finally { setBeatAnalysisBusy(false); }
  }
  function clearBeatMarkers() { setBeatMarkers([]); setStatus("Beat markers cleared."); }
  function applyExportPreset(preset: string) {
    const profiles: Record<string, { ratio: string; quality: string; fps: string }> = {
      "TikTok / Reels / Shorts": { ratio: "9:16", quality: "1080p", fps: "30 FPS" },
      "YouTube": { ratio: "16:9", quality: "1080p", fps: "30 FPS" },
      "YouTube 4K": { ratio: "16:9", quality: "4K Ultra HD", fps: "30 FPS" },
      "Instagram square": { ratio: "1:1", quality: "1080p", fps: "30 FPS" },
      "Instagram portrait": { ratio: "4:5", quality: "1080p", fps: "30 FPS" },
      "Facebook landscape": { ratio: "16:9", quality: "1080p", fps: "30 FPS" },
      "WhatsApp status": { ratio: "9:16", quality: "720p", fps: "30 FPS" }
    };
    const profile = profiles[preset];
    if (!profile) return;
    setExportPreset(preset);
    setAspectRatio(profile.ratio);
    setExportQuality(profile.quality);
    setExportFps(profile.fps);
    setStatus("Export preset applied: " + preset + ". You can still customise quality and frame rate.");
  }
  async function saveCurrentProject() {
    try {
      if (isNativeAndroid()) {
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
        const filename = (projectName || "nexus-project").replace(/[^a-z0-9-_]+/gi, "-") + ".nexusproj";
        await saveProjectOnAndroid(blob, filename);
        setStatus("Project backup saved in Documents/NEXUS Projects. Re-import the original media files when reopening it.");
      } else {
        downloadProject(project, assets);
        setStatus("Project backup downloaded. Keep the original media files so you can relink them when reopening.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the project backup.");
    }
  }
  async function startVideoExport() {
    if (exportBusy) return;
    if (!hasExportableContent || duration <= 0) { setStatus("Add a video, photo, image layer or text layer before exporting."); return; }
    const fps = Number.parseInt(exportFps, 10) || 30;
    const size = getExportDimensions(aspectRatio, exportQuality);
    const controller = new AbortController();
    exportAbortController.current = controller;
    setExportBusy(true); setExportProgress(0);
    setStatus("Preparing media, audio mix and graphics layers for export…");
    try {
      const blob = await renderTimeline({
        assets, clips, textLayers, imageLayers, tracks: trackStates.map(track=>({...track,...(trackMix[track.id]||{})})), width: size.width, height: size.height, fps, masterGain: masterOutputGain,
        duration: Math.max(0.1, duration), signal: controller.signal,
        onProgress: value => { setExportProgress(value); setStatus("Rendering video · " + value + "%"); }
      });
      const extension = blob.type.toLowerCase().includes("mp4") ? "mp4" : "webm";
      const filename = (projectName || "nexus-video").replace(/[^a-z0-9-_]+/gi, "-") + "." + extension;
      if (isNativeAndroid()) {
        await saveExportOnAndroid(blob, filename);
        setStatus("Export complete · " + filename + " saved in Documents/NEXUS Exports. The Android share sheet is ready.");
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = filename;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        setStatus("Export complete · " + extension.toUpperCase() + " video saved to your device.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Video export failed. Your project is unchanged.");
    } finally { if (exportAbortController.current === controller) exportAbortController.current = null; setExportBusy(false); }
  }
  async function startNativeClipTranscode() {
    if (exportBusy) return;
    if (!isNativeAndroid() || !selectedClip || !asset || asset.kind !== "video" || !asset.file) {
      setStatus("Select a video imported through the Android APK picker to use native Media3 clip transcoding.");
      return;
    }
    setExportBusy(true); setStatus("Android Media3 is transcoding the selected source video…");
    try {
      const output = await transcodeNativeVideo(asset.file);
      const filename = (projectName || "nexus-native-clip").replace(/[^a-z0-9-_]+/gi, "-") + "-native.mp4";
      await saveExportOnAndroid(output, filename);
      setStatus("Native Media3 source-clip transcode saved. This output contains the source clip only, not the complete edited timeline.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Native Media3 transcode failed. Your project remains unchanged.");
    } finally { setExportBusy(false); }
  }
  function cancelVideoExport() {
    if (!exportAbortController.current) return;
    exportAbortController.current.abort();
    setStatus("Cancelling export safely… your project is unchanged.");
  }
  function runProjectVerification() {
    const result=verifyProject(assets,clips); const render=getRenderCapabilities();
    const health=getBrowserEngineHealth();
    const imageIssues=imageLayers.flatMap(layer=>[
      !assets.some(item=>item.id===layer.assetId&&item.kind==="image")?"Image layer "+layer.id+" has no imported image asset.":null,
      !Number.isFinite(layer.start)||!Number.isFinite(layer.duration)||layer.duration<=0?"Image layer "+layer.id+" has invalid timing.":null,
      !Number.isFinite(layer.opacity)||layer.opacity<0||layer.opacity>1?"Image layer "+layer.id+" has invalid opacity.":null
    ].filter(Boolean) as string[]);
    const textIssues=textLayers.flatMap(layer=>[
      !Number.isFinite(layer.start)||!Number.isFinite(layer.duration)||layer.duration<=0?"Text layer "+layer.id+" has invalid timing.":null,
      !layer.text.trim()?"Text layer "+layer.id+" is empty.":null
    ].filter(Boolean) as string[]);
    const layerIssues=[...imageIssues,...textIssues];
    const lines=[result.ok&&!layerIssues.length?"Project and layer structure check passed.":"Project structure check found issues.",...result.issues,...layerIssues,"Timeline layers: "+clips.length+" clips · "+imageLayers.length+" image layers · "+textLayers.length+" text layers",hasExportableContent?"Renderable content is present.":"No exportable visual content is present.",render.summary,"ENGINE STATUS",...health.map(engine=>engine.id+": "+engine.state+" — "+engine.note)];
    setEngineReport(lines);setAiReply(lines.join(" "));
  }
  async function generateSceneMedia(scene: {title:string;visual:string;narration:string;searchTerms:string[];duration?:number}, engine:"image"|"video") {
    const key=engine+":"+scene.title;
    setGenerationBusy(key); setAiReply("Preparing "+engine+" generation for "+scene.title+"…");
    try {
      const prompt=scene.visual+"; "+scene.searchTerms.join(", ")+". Create a polished, usable visual for this exact scene. No text, captions, logos or watermarks.";
      if(engine==="image") {
        const generated=await generateNexusWorkerImage(prompt);
        const response=await fetch(generated.image);
        const blob=await response.blob();
        const extension=generated.mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi,"")||"png";
        const file=new File([blob],scene.title.replace(/[^a-z0-9-_]+/gi,"-")+"-generated."+extension,{type:generated.mimeType});
        const created:MediaAsset={id:uid(),name:scene.title+" · AI generated",kind:"image",duration:Math.max(1,scene.duration||5),mimeType:file.type,file,objectUrl:URL.createObjectURL(file),source:{type:"generated",creator:"Cloudflare Workers AI"}};
        setAssets(old=>[...old,created]);
        const target=clips.find(item=>item.aiScene?.title===scene.title);
        if(target) {
          const replacement:TimelineClip={...target,assetId:created.id,sourceIn:0,sourceOut:Math.max(.5,clipDuration(target)),label:scene.title+" · AI generated",aiScene:{...target.aiScene!,sourceType:"generated"}};
          applyClipChange(clips.map(item=>item.id===target.id?replacement:item),"Generated image replaced the storyboard placeholder.");
          setSelected(target.id);setPlayhead(target.start);
          setAiReply("Image generated, imported and placed over the matching storyboard placeholder. Its timeline position is preserved.");
        } else {
          const clip:TimelineClip={id:uid(),assetId:created.id,trackId:"video-1",start:timelineDuration(clips),sourceIn:0,sourceOut:created.duration,label:created.name};
          applyClipChange([...clips,clip],"Generated image added to the editable timeline.");
          setSelected(clip.id);setPlayhead(clip.start);
          setAiReply("Image generated, imported and added to the editable timeline.");
        }
        setPage("editor");
      } else {
        const job=await submitEngineJob(engine,prompt,{sceneTitle:scene.title,duration:scene.duration||5,aspectRatio:aiFormat,style:aiStyle,negativePrompt:"watermarks, captions, logos, distorted anatomy"});
        setGenerationJobs(old=>[{...job,sceneTitle:scene.title},...old.filter(item=>item.id!==job.id)]);
        setAiReply("Video generation job queued for "+scene.title+". Refresh its status to see real worker progress.");
      }
    } catch(error) {
      const message=error instanceof Error?error.message:"Generation worker unavailable.";
      setAiReply(message+" Your storyboard and timeline have not been changed.");
      setGenerationJobs(old=>[{id:"unavailable-"+Date.now(),engine,state:"failed",progress:0,message,sceneTitle:scene.title,error:message},...old]);
    } finally { setGenerationBusy(null); }
  }
  const importedGenerationOutputs = useRef<Set<string>>(new Set());
  const generationRefreshInFlight = useRef<Set<string>>(new Set());
  async function refreshGenerationJob(job:NexusEngineJob & {sceneTitle:string}) {
    if (generationRefreshInFlight.current.has(job.id)) return;
    generationRefreshInFlight.current.add(job.id);
    let reservedUrl = "";
    let reservedObjectUrl = "";
    try {
      const latest=await getEngineJob(job.engine,job.id);
      setGenerationJobs(old=>old.map(item=>item.id===job.id?{...item,...latest,sceneTitle:job.sceneTitle}:item));
      if(latest.state!=="succeeded" || !latest.output?.url || job.engine==="render") return;
      const url=latest.output.url;
      if(!/^https:\/\//i.test(url)) throw new Error("Worker output must use a secure HTTPS URL.");
      if(importedGenerationOutputs.current.has(url) || assets.some(item=>item.source?.type==="generated"&&item.source.pageUrl===url)) return;
      importedGenerationOutputs.current.add(url); reservedUrl=url;
      const response=await fetch(url,{headers:{Accept:"image/*,video/*,audio/*"}});
      if(!response.ok) throw new Error("Generated output could not be downloaded (HTTP "+response.status+").");
      const blob=await response.blob();
      const expectedKind=job.engine as "image"|"video"|"audio";
      const declared=(latest.output.mimeType||"").split(";")[0].trim().toLowerCase();
      const actual=(blob.type||"").split(";")[0].trim().toLowerCase();
      const mimeType=actual||declared;
      if(!mimeType || mimeType==="application/octet-stream") throw new Error("The worker did not provide a verifiable media MIME type. The output was not imported.");
      if(!mimeType.startsWith(expectedKind+"/")) throw new Error("The "+job.engine+" worker returned "+mimeType+" instead of "+expectedKind+" media. Nothing was added to the project.");
      const extension=mimeType.split("/")[1]?.replace(/[^a-z0-9.+-]/gi,"")||"bin";
      const safeName=job.sceneTitle.replace(/[^a-z0-9-_]+/gi,"-").slice(0,70)||"nexus";
      const file=new File([blob],safeName+"-generated."+extension,{type:mimeType});
      const objectUrl=URL.createObjectURL(file);
      reservedObjectUrl=objectUrl;
      let mediaDuration=5;
      if(expectedKind!=="image") {
        const probe=document.createElement(expectedKind);
        probe.preload="metadata"; probe.src=objectUrl;
        try {
          mediaDuration=await new Promise<number>((resolve,reject)=>{
            const timer=window.setTimeout(()=>reject(new Error("Generated media metadata could not be read. The output was downloaded but not imported.")),12000);
            probe.onloadedmetadata=()=>{window.clearTimeout(timer);resolve(Number.isFinite(probe.duration)&&probe.duration>0?probe.duration:0);};
            probe.onerror=()=>{window.clearTimeout(timer);reject(new Error("Generated media could not be decoded by this browser. It was not added to the timeline."));};
          });
        } finally { probe.removeAttribute("src");probe.load(); }
      }
      if(expectedKind!=="image"&&mediaDuration<=0) throw new Error("Generated media has no usable duration.");
      const created:MediaAsset={id:uid(),name:job.sceneTitle+" · NEXUS generated",kind:expectedKind,duration:expectedKind==="image"?5:mediaDuration,mimeType:file.type,file,objectUrl,source:{type:"generated",pageUrl:url,creator:"NEXUS managed model worker"}};
      setAssets(old=>[...old,created]);
      const sceneTitle=job.sceneTitle.startsWith("Scene · ")?job.sceneTitle.slice(8):"";
      const sceneFallback=sceneTitle?clips.find(item=>item.aiScene?.title===sceneTitle):undefined;
      if(sceneFallback){
        const replacement:TimelineClip={...sceneFallback,assetId:created.id,sourceIn:0,sourceOut:expectedKind==="image"?Math.max(.5,clipDuration(sceneFallback)):created.duration,label:sceneTitle+" · AI generated",aiScene:{...sceneFallback.aiScene!,sourceType:"generated"}};
        applyClipChange(clips.map(item=>item.id===sceneFallback.id?replacement:item),"Generated scene media replaced its editable placeholder.");
        setSelected(sceneFallback.id);setPlayhead(sceneFallback.start);
        setAiReply("Generated "+expectedKind+" imported and automatically replaced the placeholder for “"+sceneTitle+"”. The scene stays in its planned timeline position.");
      } else {
        const isBackground=job.sceneTitle.startsWith("Project background · ");
        const replaceMatch=job.sceneTitle.match(/^Project background · Replace ([a-zA-Z0-9-]+) · /);
        const replaceLayerId=replaceMatch?.[1];
        const existingTarget=replaceLayerId?imageLayers.find(layer=>layer.id===replaceLayerId):undefined;
        if(replaceLayerId && existingTarget && expectedKind==="image") {
          recordProjectHistory();
          setImageLayers(old=>old.map(layer=>layer.id===replaceLayerId?{...layer,assetId:created.id,generationPrompt:job.sceneTitle,generationJobId:job.id}:layer));
          setSelectedImageLayer(replaceLayerId);
          setAiReply("Replacement image imported and swapped into the selected layer. Its timing, position, scale, opacity and stacking role were preserved.");
        } else if(isBackground && expectedKind==="image") {
          recordProjectHistory();
          const background:TimelineImageLayer={id:uid(),assetId:created.id,trackId:"image-1",start:Math.max(0,playhead),duration:Math.max(5,selectedClip?selectedClip.start+clipDuration(selectedClip)-playhead:duration-playhead),x:50,y:50,scale:1,rotation:0,opacity:1,visible:true,locked:false,fit:"cover",generationPrompt:job.sceneTitle,generationJobId:job.id};
          setImageLayers(old=>[...old,background]);
          setSelectedImageLayer(background.id);
          setAiReply("Generated background imported as a full-frame image layer beneath your footage. It is editable on the Images & Stickers track.");
        } else {
          const clip:TimelineClip={id:uid(),assetId:created.id,trackId:expectedKind==="audio"?"audio-1":"video-1",start:isBackground?Math.max(0,playhead):timelineDuration(clips),sourceIn:0,sourceOut:created.duration,label:created.name,gain:1,muted:false};
          applyClipChange([...clips,clip],isBackground?"Generated background clip imported at the playhead.":"Generated "+expectedKind+" added to the editable timeline.");
          setSelected(clip.id);setPlayhead(clip.start);
          setAiReply("Generated "+expectedKind+" imported into the project and added to the timeline. You can now edit it.");
        }
      }
      setPage("editor");
    } catch(error) {
      if(reservedObjectUrl) URL.revokeObjectURL(reservedObjectUrl);
      if(reservedUrl) importedGenerationOutputs.current.delete(reservedUrl);
      const message = error instanceof Error ? error.message : "Could not refresh this generation job.";
      setGenerationJobs(old => old.map(item => item.id === job.id ? { ...item, state: "failed", error: message, message } : item));
      setAiReply(message);
    } finally {
      generationRefreshInFlight.current.delete(job.id);
    }
  }
  async function buildAIProjectTimeline() {
    if (!aiPlan) return;
    const visualAssets = assets.filter(item => item.kind === "video" || item.kind === "image");
    const defaultSceneLength = aiPlan.duration / aiPlan.scenes.length;
    const additions: MediaAsset[] = [];
    const newClips: TimelineClip[] = [];
    const newTextLayers: TimelineTextLayer[] = [];
    let cursor = timelineDuration(clips);
    let queuedGenerationCount = 0;
    let generatedImageCount = 0;
    const pendingWorkerImages: { scene: any; clipId: string; duration: number }[] = [];
    for (const [index, scene] of aiPlan.scenes.entries()) {
      const sceneLength = scene.duration || defaultSceneLength;
      const terms = scene.searchTerms.join(" ").toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3);
      let chosen = visualAssets.find(item => terms.some(word => item.name.toLowerCase().includes(word)));
      if (!chosen) {
        try {
          const online = await searchWikimediaCommons(scene.searchTerms[0] || scene.visual);
          const candidate = online.find(item => item.mediaKind === "video" || item.mediaKind === "image");
          if (candidate) {
            const response = await fetch(candidate.downloadUrl);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], candidate.fileName || "nexus-sourced-media", { type: blob.type || candidate.mimeType });
              chosen = { id: uid(), name: candidate.title, kind: candidate.mediaKind, duration: candidate.mediaKind === "image" ? sceneLength : 5, mimeType: file.type, file, objectUrl: URL.createObjectURL(file), source: { type: "commons", pageUrl: candidate.pageUrl, creator: candidate.creator, license: candidate.license, licenseUrl: candidate.licenseUrl, attribution: candidate.attribution } };
              additions.push(chosen);
            }
          }
        } catch { /* use the honest native scene fallback below */ }
      }
      if (!chosen) {
        const safeTitle = escapeXml(scene.title.slice(0, 90));
        const safeTopic = escapeXml(aiPlan.title.slice(0, 120));
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17143c"/><stop offset="1" stop-color="#07566b"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#g)"/><circle cx="850" cy="320" r="300" fill="#8c70ff" opacity=".18"/><circle cx="120" cy="1600" r="380" fill="#20d7dc" opacity=".13"/><text x="90" y="820" fill="#9eeaf1" font-family="Arial" font-size="38" letter-spacing="9">NEXUS EDITOR</text><text x="90" y="980" fill="white" font-family="Arial" font-size="76" font-weight="700">' + safeTitle + '</text><foreignObject x="90" y="1060" width="900" height="360"><div xmlns="http://www.w3.org/1999/xhtml" style="font:32px Arial;color:#e5e7ff;line-height:1.4">' + safeTopic + '</div></foreignObject><text x="90" y="1770" fill="#b5b6d9" font-family="Arial" font-size="26">EDITABLE PROJECT STARTER · SCENE ' + (index + 1) + '</text></svg>';
        const file = new File([svg], 'nexus-scene-' + (index + 1) + '.svg', { type: "image/svg+xml" });
        const objectUrl = URL.createObjectURL(file);
        chosen = { id: uid(), name: scene.title + " · Native scene", kind: "image", duration: sceneLength, mimeType: "image/svg+xml", file, objectUrl, source: { type: "generated", attribution: "Created inside NEXUS Editor from editable project brief" } };
        additions.push(chosen);
      }
      const sourceDuration = chosen.kind === "image" ? sceneLength : Math.min(sceneLength, Math.max(0.5, chosen.duration || sceneLength));
      newClips.push({ id: uid(), assetId: chosen.id, trackId: "video-1", start: cursor, sourceIn: 0, sourceOut: sourceDuration, label: scene.title, aiScene: { title: scene.title, visual: scene.visual, narration: scene.narration, sourceType: chosen.source?.type === "commons" ? "commons" : chosen.source?.type === "personal" ? "personal" : "native-fallback" } });
      newTextLayers.push({ id: uid(), trackId: "text-1", start: cursor, duration: Math.min(sourceDuration, 4), text: scene.title, color: "#ffffff", fontSize: 44, fontFamily: "Arial", x: 50, y: 78 });
      if (chosen.source?.attribution?.includes("Created inside NEXUS Editor")) {
        const engine: "image" | "video" | null = engineAvailability?.engines?.video?.configured ? "video" : engineAvailability?.engines?.image?.configured ? "image" : null;
        if (engine === "image") {
          pendingWorkerImages.push({ scene, clipId: newClips[newClips.length - 1].id, duration: sourceDuration });
        } else if (engine === "video") {
          try {
            const job = await submitEngineJob("video", scene.visual + ". Create a clean, usable visual asset for this exact storyboard scene; no text, captions, logos or watermarks.", {
              sceneTitle: scene.title, projectName: aiPlan.title, duration: sourceDuration, aspectRatio, style: aiStyle,
              target: "replace-ai-scene-placeholder", sceneIndex: index, source: "nexus-project-aware-brain",
              negativePrompt: "watermarks, captions, logos, unreadable text, distorted anatomy"
            });
            setGenerationJobs(old => [{ ...job, sceneTitle: "Scene · " + scene.title }, ...old.filter(item => item.id !== job.id)]);
            queuedGenerationCount += 1;
          } catch (error) {
            setEngineReport(old => [...old, "Video generation not queued for " + scene.title + ": " + (error instanceof Error ? error.message : "worker unavailable")]);
          }
        }
      }
      cursor += sourceDuration;
    }
    setAssets(old => [...old, ...additions]);
    setTextLayers(old => [...old, ...newTextLayers]);
    applyClipChange([...clips, ...newClips], "AI storyboard added as " + newClips.length + " editable scenes with timed title layers");
    setSelected(newClips[0]?.id || null);
    setPlayhead(newClips[0]?.start || 0);
    setActiveTool("edit"); setActiveSubtool("select"); setAiWorkflowStage("editing"); setPage("editor");
    for (const pending of pendingWorkerImages) {
      setGenerationBusy("image:storyboard:" + pending.scene.title);
      setAiReply("Generating scene image " + (generatedImageCount + 1) + " of " + pendingWorkerImages.length + " and importing it into your storyboard…");
      try {
        await generateImageIntoProject(pending.scene.visual + ". Create a clean, usable visual asset for this exact storyboard scene; no text, captions, logos or watermarks.", "Scene · " + pending.scene.title, undefined, pending.clipId, [...clips, ...newClips]);
        queuedGenerationCount += 1;
        generatedImageCount += 1;
      } catch (error) {
        setEngineReport(old => [...old, "Image generation not completed for " + pending.scene.title + ": " + (error instanceof Error ? error.message : "worker unavailable")]);
      } finally { setGenerationBusy(null); }
    }
    setAiReply("Your storyboard is now on the timeline as editable clips. Existing media was matched where possible; " + generatedImageCount + " missing scene image(s) were generated and imported" + (pendingWorkerImages.length > generatedImageCount ? "; some image requests could not complete and their editable placeholders remain." : "") + (queuedGenerationCount > generatedImageCount ? " " + (queuedGenerationCount - generatedImageCount) + " additional video job(s) were queued." : "") + (pendingWorkerImages.length === 0 ? " Missing visuals remain as editable native placeholders because no image worker was configured." : "") + " You can select, reorder, split or replace the clips. No finished video has been rendered.");
  }
  async function createAIProjectPlan(briefOverride?: string) {
    const brief = (briefOverride ?? aiBrief).trim();
    if (!brief) { setAiReply("Describe the video you want to make first."); return; }
    setAiWorkflowStage("planning");
    setAiReply("NEXUS AI Director is planning your scenes…");
    try {
      const visualSamples = assets.length ? await captureVisualSamples(assets, 8) : [];
      const referenceWorkflow = buildReferenceContext(assets, mediaAnalyses);
      const result = await askNexusDirector(brief, { mode: "create-storyboard", aspectRatio: aiFormat, style: aiStyle, assets: assets.map(item => ({name:item.name,kind:item.kind,source:item.source?.type})), referenceWorkflow, visualSamples, existingClips: clips.length, hasPersonalReference: assets.some(item => item.source?.type === "personal") });
      const rawScenes = Array.isArray(result.plan.scenes) ? result.plan.scenes.slice(0, 8) : [];
      if (rawScenes.length < 3) throw new Error("The AI Director returned too few scenes. Please try the brief again.");
      const match = /\b(\d+)\s*(seconds?|secs?|s)\b/i.exec(brief);
      const target = match ? Math.min(180,Math.max(10,Number(match[1]))) : 30;
      const plannedScenes = rawScenes.map((scene,index) => ({ title: String(scene.title || "Scene " + (index+1)).slice(0, 64), visual: String(scene.visual || "Supporting visual").slice(0, 600), narration: String(scene.narration || "").slice(0, 900), searchTerms: Array.isArray(scene.searchTerms) && scene.searchTerms.length ? scene.searchTerms.slice(0,4).map((term:string)=>String(term).slice(0,100)) : [String(scene.visual || brief).slice(0,120)], fallback: "Editable NEXUS scene card until a generation worker is configured", duration: target / rawScenes.length }));
      setAiPlan({title:brief.slice(0,72),duration:target,scenes:plannedScenes,sourcingNote:result.plan.userReferenceNeeded ? "A personal reference photo or video is needed to depict you accurately." : "NEXUS will search licensed media first; missing visuals use editable native scenes until generation workers are connected."});
      setAiWorkflowStage("review");
      setAiReply(result.plan.summary + " Review the scenes and approve before timeline changes are made.");
      setEngineReport(["AI Director connected · " + result.model,...result.plan.editPlan.map(step => step.action + " · " + step.target + ": " + step.details)]);
      setProjectName(brief.slice(0,48)); setAspectRatio(aiFormat); setActiveTool("media");
      return;
    } catch (error) {
      setEngineReport(["AI Director unavailable · local fallback used",error instanceof Error ? error.message : "No AI provider response."]);
    }
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
    const scenes = sceneIdeas.map((scene, index) => ({ ...scene, title: scene.title, narration: scene.narration, visual: scene.visual, searchTerms: scene.searchTerms, duration: totalSeconds / sceneIdeas.length }));
    setAiPlan({ title: topic.charAt(0).toUpperCase() + topic.slice(1), duration: totalSeconds, scenes, sourcingNote: assets.length ? "Your imported media can be analysed and matched to these scenes in the next creation step." : "No personal media detected. Search approved stock/public-domain sources first; if suitable reusable media is unavailable, use the listed editor-native fallback scenes. Wikimedia Commons search is available in the editor media panel." });
    setAiWorkflowStage("review");
    setAiReply("The AI Brain is not configured yet, so NEXUS prepared a local storyboard fallback. Approved scenes will search reusable online media before using native title-card fallbacks.");
    setProjectName(topic.charAt(0).toUpperCase() + topic.slice(1));
    setAspectRatio(aiFormat);
    setActiveTool("media");
  }
  function applyReferencePlanToTimeline(plan: { scenes: { title: string; visual: string; narration: string; duration: number; searchTerms: string[]; assetMatches?: string[]; matchReason?: string; overlayText?: string; referenceStart?: number; referenceEnd?: number; transitionStyle?: "fade"|"zoom"|"wipe"|"slide"|"blur"|"none"; transitionDuration?: number; textX?: number; textY?: number; audioCueTime?: number; audioCueType?: string }[] }, context: ReturnType<typeof buildReferenceContext>) {
    const replacementAssets = assets.filter(item => {
      const role = context.find(entry => entry.id === item.id)?.role;
      return item.kind !== "audio" && role !== "reference video";
    });
    if (!replacementAssets.length) {
      setAiReply("I have prepared the reference edit plan, but I need replacement pictures or clips before I can build the new timeline. The reference video is kept as a style guide, not reused as replacement footage.");
      return false;
    }
    const audioSources = assets.filter(item => item.kind === "audio");
    const base = timelineDuration(clips);
    let cursor = base;
    const additions: TimelineClip[] = [];
    const textAdditions: TimelineTextLayer[] = [];
    const audioTrackIds = ["audio-1", "audio-2", "audio-3", "audio-4"];
    const usedAudioTracks = new Set(clips.filter(clip => clip.trackId.startsWith("audio-")).map(clip => clip.trackId));
    let sceneCount = 0;
    const sceneAssetUse = new Map<string, number>();
    const matchNotes: string[] = [];
    const sceneStarts: number[] = [];
    const plannedAudioCues: { time: number; type: string }[] = [];
    for (const [index, scene] of plan.scenes.slice(0, 8).entries()) {
      const ranked = rankSceneAssets(scene, replacementAssets, context, sceneAssetUse);
      const bestMatch = ranked[0];
      const chosen = bestMatch?.asset;
      if (chosen) {
        sceneAssetUse.set(chosen.id, (sceneAssetUse.get(chosen.id) || 0) + 1);
        matchNotes.push("Scene " + (index + 1) + " → " + chosen.name + " (" + (bestMatch?.confidence || "low") + " confidence)");
      }
      if (!chosen) continue;
      const referenceSpan = Number.isFinite(scene.referenceStart) && Number.isFinite(scene.referenceEnd) && (scene.referenceEnd as number) > (scene.referenceStart as number)
        ? Math.min(60, (scene.referenceEnd as number) - (scene.referenceStart as number)) : 0;
      const requestedLength = Math.max(1, Math.min(60, referenceSpan || Number(scene.duration) || 5));
      const availableLength = Math.max(0.5, Number(chosen.duration) || requestedLength);
      const sourceLength = chosen.kind === "image" ? requestedLength : Math.min(requestedLength, availableLength);
      const transitionStyle = scene.transitionStyle === "none" ? undefined : scene.transitionStyle || "fade";
      const transitionDuration = Math.min(1.5, Math.max(0, Number(scene.transitionDuration) || 0.35), sourceLength * 0.25);
      sceneStarts.push(cursor);
      const clip: TimelineClip = {
        id: uid(), assetId: chosen.id, trackId: "video-1", start: cursor,
        sourceIn: 0, sourceOut: sourceLength, label: scene.title || chosen.name,
        transitionIn: index === 0 || !transitionStyle ? 0 : transitionDuration,
        transitionOut: transitionStyle ? transitionDuration : 0, ...(transitionStyle ? { transitionStyle } : {}),
        fit: "cover", speed: 1,
        aiScene: { title: scene.title, visual: scene.visual, narration: scene.narration, sourceType: chosen.source?.type === "commons" ? "commons" : chosen.source?.type === "personal" ? "personal" : "native-fallback" }
      };
      additions.push(clip);
      const title = (scene.overlayText || scene.title || "").trim();
      if (title) textAdditions.push({
        id: uid(), trackId: "text-1", start: cursor, duration: Math.min(sourceLength, 4),
        text: title.slice(0, 180), color: "#ffffff", fontSize: 42, fontFamily: "Arial",
        x: Math.max(5, Math.min(95, Number(scene.textX) || 50)), y: Math.max(5, Math.min(95, Number(scene.textY) || 78)),
        align: "center", shadow: true, animation: "fade"
      });
      if (Number.isFinite(scene.audioCueTime)) plannedAudioCues.push({ time: Math.max(0, Number(scene.audioCueTime)), type: String(scene.audioCueType || "reference cue").slice(0, 48) });
      cursor += sourceLength;
      sceneCount++;
    }
    if (!additions.length) return false;
    const audioAdditions: TimelineClip[] = [];
    for (const [index, source] of audioSources.slice(0, 3).entries()) {
      const trackId = audioTrackIds.find(id => !usedAudioTracks.has(id)) || audioTrackIds[audioAdditions.length % audioTrackIds.length];
      usedAudioTracks.add(trackId);
      const length = Math.max(0.5, Number(source.duration) || 5);
      const cue = plannedAudioCues[index];
      const cueOffset = cue ? Math.min(Math.max(0, cursor - base - 0.5), cue.time) : 0;
      audioAdditions.push({
        id: uid(), assetId: source.id, trackId, start: base + cueOffset, sourceIn: 0,
        sourceOut: length, label: source.name + (cue ? " · " + cue.type : ""), gain: 0.75, muted: false,
        fadeIn: 0.4, fadeOut: 0.8, speed: 1
      });
    }
    applyClipChange([...clips, ...additions, ...audioAdditions], "AI reference edit assembled on the timeline.");
    setTextLayers(old => [...old, ...textAdditions]);
    setSelected(additions[0].id);
    setPlayhead(base);
    setProjectName(projectName || "NEXUS Reference Edit");
    setPage("editor"); setEditorView("workspace");
    setActiveTool("edit"); setActiveSubtool("select");
    setAiWorkflowStage("editing");
    setEngineReport(old => [...old, ...matchNotes, ...plannedAudioCues.map(cue => "Suggested audio cue at " + cue.time.toFixed(2) + "s · " + cue.type), "Reference timing is approximate; sparse frame samples cannot confirm exact cuts."]);
    setAiReply("I built an editable reference-inspired sequence with " + sceneCount + " visual scenes, " + textAdditions.length + " timed title layers and " + audioAdditions.length + " imported audio track(s). Scene durations, transition styles and title positions use the AI's approximate reference observations where available. Audio cue offsets are suggestions, not verified beat detection. Review the draft; it is not a finished export.");
    return true;
  }
  async function runAICommand() {
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
      setAiReply("NEXUS AI Director is reviewing your brief and current project…");
      try {
        const visualSamples = assets.length ? await captureVisualSamples(assets, 8) : [];
        const result = await askNexusDirector(aiBrief.trim(), {
          projectName, assetCount: assets.length, assets: assets.map(item => ({ name: item.name, kind: item.kind, source: item.source?.type })),
          referenceWorkflow: buildReferenceContext(assets, mediaAnalyses), visualSamples,
          clipCount: clips.length, selectedClip: selectedClip ? { id: selectedClip.id, label: selectedClip.label, trackId: selectedClip.trackId, start: selectedClip.start, duration: clipDuration(selectedClip), filter: selectedClip.filter, fit: selectedClip.fit, aiScene: selectedClip.aiScene?.title || null } : null,
          selectedImageLayer: (() => { const layer=imageLayers.find(item=>item.id===selectedImageLayer); const media=layer?assets.find(item=>item.id===layer.assetId):undefined; return layer?{id:layer.id,assetName:media?.name||"Missing image asset",role:layer.fit==="cover"?"background":"overlay or sticker",start:layer.start,duration:layer.duration,x:layer.x,y:layer.y,scale:layer.scale,opacity:layer.opacity,visible:layer.visible,locked:layer.locked}:null; })(),
          selectedTextLayer: (() => { const layer=textLayers.find(item=>item.id===selectedTextLayer); return layer?{id:layer.id,text:layer.text.slice(0,180),start:layer.start,duration:layer.duration,x:layer.x,y:layer.y,visible:layer.visible,locked:layer.locked}:null; })(),
          timelineSummary: { imageLayers:imageLayers.length, textLayers:textLayers.length, duration },
          activeTool, aspectRatio, hasPersonalReference: assets.some(item => item.source?.type === "personal")
        });
        const plan = result.plan;
        setAiReply(plan.summary + "\n\n" + plan.editPlan.map(step => step.action + " · " + step.target + ": " + step.details).join("\n") + (plan.userReferenceNeeded ? "\n\nA reference photo/video is needed to represent you accurately." : ""));
        setEngineReport(["AI Director connected · " + result.model, ...plan.assetNeeds.map(item => "Asset needed: " + item.kind + " — " + item.query + " (" + item.reason + ")")]);
      } catch (error) {
        setAiReply(error instanceof Error ? error.message : "NEXUS AI Director is unavailable. Local editor commands remain available.");
      }
      return;
    }
    // NEXUS AI tool bridge: translate natural-language requests into real editor operations.
    // Local tools edit the current project immediately; model-worker jobs are only submitted when configured.
    const selectedKind = asset?.kind;
    const visualSelected = Boolean(selectedClip && selectedKind && selectedKind !== "audio");
    const normalized = request.replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
    const activeImageLayer=imageLayers.find(layer=>layer.id===selectedImageLayer);
    if(activeImageLayer) {
      if(/\b(regenerate|replace|make another|new version)\b/.test(normalized)) { await regenerateSelectedImageLayer(); return; }
      if(/\b(hide|turn off)\b/.test(normalized)) { updateSelectedImageLayer({visible:false}); setAiReply("Selected image layer hidden. Undo can restore the previous project state."); return; }
      if(/\b(show|turn on)\b/.test(normalized)) { updateSelectedImageLayer({visible:true}); setAiReply("Selected image layer is visible again."); return; }
      if(/\block\b/.test(normalized)) { updateSelectedImageLayer({locked:true}); setAiReply("Selected image layer locked."); return; }
      if(/\bunlock\b/.test(normalized)) { updateSelectedImageLayer({locked:false}); setAiReply("Selected image layer unlocked."); return; }
      if(/\b(background|full frame|fill the canvas)\b/.test(normalized)) { updateSelectedImageLayer({fit:"cover",x:50,y:50,scale:1,rotation:0}); setAiReply("Selected image layer set as a full-frame background. Background layers render below footage; sticker layers stay above it."); return; }
      if(/\b(send back|backward|behind)\b/.test(normalized)) { reorderSelectedImageLayer(-1); setAiReply("Selected image layer moved backward in the image-layer stack."); return; }
      if(/\b(bring forward|forward|front)\b/.test(normalized)) { reorderSelectedImageLayer(1); setAiReply("Selected image layer moved forward in the image-layer stack."); return; }
      const moveLayerMatch = normalized.match(/\b(?:move|start|place)\s+(?:this\s+)?(?:image\s+)?layer\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)\b/i);
      if(moveLayerMatch) { const nextStart=Math.max(0,Math.min(600,Number(moveLayerMatch[1]))); updateSelectedImageLayer({start:nextStart}); setAiReply("Selected image layer moved to "+nextStart+" seconds. Undo is available."); return; }
      const durationLayerMatch = normalized.match(/\b(?:set\s+)?(?:this\s+)?(?:image\s+)?layer\s+duration\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)\b/i);
      if(durationLayerMatch) { const nextDuration=Math.max(.1,Math.min(600,Number(durationLayerMatch[1]))); updateSelectedImageLayer({duration:nextDuration}); setAiReply("Selected image layer duration set to "+nextDuration+" seconds. Undo is available."); return; }
      if(/\b(delete|remove)\b/.test(normalized)) { recordProjectHistory(); setImageLayers(old=>old.filter(layer=>layer.id!==activeImageLayer.id)); setSelectedImageLayer(null); setAiReply("Selected image layer removed. Undo can restore it."); return; }
    }

    const referenceIntent = detectReferenceWorkflow(normalized);
    if (referenceIntent.extractAudio) {
      if (!selectedClip || !asset || asset.kind !== "video") {
        const videoClip = clips.find(item => assets.find(media => media.id === item.assetId)?.kind === "video");
        if (videoClip) {
          setSelected(videoClip.id);
          setAiReply("I found a video in your project. Select that video clip, then send “extract the audio” again so I can extract the correct segment.");
        } else setAiReply("Import a video, add it to the timeline, select it, then ask me to extract its audio.");
        return;
      }
      setAiReply("Extracting the selected video's audio and adding it to the timeline…");
      await extractSelectedVideoAudio();
      return;
    }
    if (referenceIntent.useReference && assets.length) {
      setAiReply("Checking the uploaded reference and replacement media…");
      try {
        const referenceContext = buildReferenceContext(assets, mediaAnalyses);
        setAiReply("Sampling your pictures and video frames for visual understanding…");
        const visualSamples = await captureVisualSamples(assets, 8);
        const result = await askNexusDirector(normalized, {
          mode: "reference-to-edit", projectName, aspectRatio, style: aiStyle,
          selectedAsset: asset ? { name: asset.name, kind: asset.kind } : null,
          referenceWorkflow: referenceContext, visualSamples, clipCount: clips.length,
          hasPersonalReference: assets.some(item => item.source?.type === "personal")
        });
        const applied = applyReferencePlanToTimeline(result.plan, referenceContext);
        if (!applied) setAiReply(result.plan.summary + "\n\n" +
          result.plan.editPlan.map(step => step.action + " · " + step.target + ": " + step.details).join("\n") +
          "\n\nThe reference plan is ready. Add replacement media to build the editable timeline.");
        setEngineReport(["AI Director · " + result.model, ...referenceContext.map(item => item.role + ": " + item.name), ...result.plan.assetNeeds.map(item => "Needed: " + item.kind + " — " + item.query), "Timeline draft: " + (applied ? "created from available replacement media" : "waiting for replacement media")]);
      } catch (error) {
        setAiReply(error instanceof Error ? error.message : "I could not prepare the reference-based editing plan. Your media remains unchanged.");
      }
      return;
    }

    const requestedTemplate = CREATIVE_TEMPLATES.find(item => normalized.includes(item.name.toLowerCase()));
    if (requestedTemplate && /template|apply|use|make|create|start/.test(normalized)) {
      applyCreativeTemplate(requestedTemplate);
      setAiReply("Applied the " + requestedTemplate.name + " template to the project. Its title, subtitle and footer are editable timeline layers; visual clips received the template colour and transition defaults. Add or replace footage to finish the design.");
      return;
    }

    const requestedEffect = CREATIVE_EFFECTS.find(item => normalized.includes(item.name.toLowerCase()));
    if (requestedEffect && /effect|look|apply|make|give|style/.test(normalized)) {
      if (!visualSelected) { setAiReply("Select a photo or video clip first. Then I can apply " + requestedEffect.name + " directly to it."); return; }
      applyCreativeEffect(requestedEffect);
      setAiReply("Applied " + requestedEffect.name + " to the selected visual clip. The effect is saved in the project settings and can be adjusted or undone.");
      return;
    }

    const styleAliases: Record<string, "portrait"|"product"|"editorial"|"mono"|"food"|"landscape"|"night"|"pastel"|"dramatic"|"warm-film"|"clean-studio"|"cool-editorial"|"soft-glow"> = {
      "portrait":"portrait","product":"product","editorial":"editorial","black and white":"mono","monochrome":"mono",
      "food":"food","landscape":"landscape","night":"night","pastel":"pastel","dramatic":"dramatic",
      "warm film":"warm-film","film":"warm-film","clean studio":"clean-studio","studio":"clean-studio",
      "cool editorial":"cool-editorial","soft glow":"soft-glow"
    };
    const requestedStyle = Object.entries(styleAliases).find(([label]) => normalized.includes(label));
    if (requestedStyle && /image|photo|picture|portrait|product|poster|style|look|edit/.test(normalized)) {
      if (!visualSelected) { setAiReply("Select an image or video clip first so I can apply the " + requestedStyle[0] + " finishing preset."); return; }
      updateSelectedClip(getImageStylePreset(requestedStyle[1]));
      setActiveTool("adjust"); setActiveSubtool("image-style");
      setAiReply("Applied the " + requestedStyle[0] + " image-finishing preset to the selected visual clip. All settings remain editable.");
      return;
    }

    const requestedFilterName = [...CREATIVE_FILTERS.map(item => item.name), ...FILTER_PRESETS].find(name => normalized.includes(name.toLowerCase()));
    if (requestedFilterName && /filter|colour|color|look|apply|make/.test(normalized)) {
      if (!visualSelected) { setAiReply("Select a photo or video clip first to apply a colour filter."); return; }
      updateSelectedClip({ filter: requestedFilterName });
      setActiveTool("filters"); setActiveSubtool(requestedFilterName);
      setAiReply("Applied the " + requestedFilterName + " filter to the selected visual clip. You can switch filters or fine-tune the image controls.");
      return;
    }

    let generatedAudioForCommand = false;
    const namedAudio = NEXUS_AUDIO_PRESETS.find(item => normalized.includes(item.name.toLowerCase()));
    const audioIntent = /music|sound effect|sfx|whoosh|impact|riser|chime|audio bed|background audio|background sound/.test(normalized) && !/full song|voiceover|narration|speech/.test(normalized);
    if (namedAudio || audioIntent) {
      const preset = namedAudio || (/(afro|afrobeats|afrobeat)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Afro Groove Bed") :
        /(cinematic|trailer|epic)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Cinematic Build Bed") :
        /(piano|emotional|warm)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Warm Piano Bed") :
        /(lo.?fi|study|chill)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Lo-fi Study Bed") :
        /(impact|hit|boom)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Cinematic Impact") :
        /(riser|build)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Trailer Riser") :
        /(chime|notification|ping)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Notification Chime") :
        /(whoosh|transition|swoosh)/.test(normalized) ? NEXUS_AUDIO_PRESETS.find(item => item.name === "Soft Whoosh") :
        NEXUS_AUDIO_PRESETS.find(item => item.name === "Ambient Pulse"));
      if (preset) {
        await addGeneratedAudio(preset);
        generatedAudioForCommand = true;
        setAiReply("Generated the original NEXUS " + preset.name + " audio locally and added the WAV asset to the audio timeline. Preview it, adjust its volume, and extend music beds by duplicating them.");
      }
    }

    const missingVisualRequest = /\b(background|backdrop|texture|overlay|footage|b.?roll|clip|scene|picture|photo|image)\b/.test(normalized) && /\b(need|needs|needed|missing|add|create|make|generate|put|place|find|use|requires?)\b/.test(normalized);
    const remoteKind = missingVisualRequest ? (/\b(video|clip|footage|b.?roll|scene)\b/.test(normalized) ? "video" : "image") :
      /\b(video|clip|footage)\b/.test(normalized) && /\b(generate|create|make)\b/.test(normalized) ? "video" :
      /\b(image|picture|photo|poster|artwork)\b/.test(normalized) && /\b(generate|create|make)\b/.test(normalized) ? "image" :
      /\b(generate|create|make)\b/.test(normalized) && /\b(narration|voiceover|speech|music track|full song)\b/.test(normalized) ? "audio" : null;
    if (!remoteKind && generatedAudioForCommand) return;
    if (remoteKind) {
      if (remoteKind === "image") {
        setGenerationBusy("image:prompt");
        const sceneTitle = /background|backdrop/i.test(normalized) ? "Project background · " + normalized.slice(0, 52) : normalized.slice(0, 64) || "NEXUS generated image";
        setAiReply("Sending your image request through the secure NEXUS server connection…");
        try {
          await generateImageIntoProject(normalized, sceneTitle);
        } catch (error) {
          setAiReply((error instanceof Error ? error.message : "NEXUS image generation is unavailable.") + " Your project has not been changed.");
        } finally { setGenerationBusy(null); }
        return;
      }
      const available = engineAvailability?.engines?.[remoteKind];
      if (!available?.configured) {
        setAiReply("The " + remoteKind + " generation worker is not connected yet. I have not pretended to generate a file. " +
          (remoteKind === "video" ? "I can build an editable storyboard from your brief, use imported or licensed media, and render the current timeline with the browser renderer." :
          "I can generate original short sound effects and music beds with the local NEXUS audio synthesiser; full narration or long-form music needs a connected audio worker."));
        return;
      }
      setGenerationBusy(remoteKind + ":prompt");
      setAiReply("Submitting your " + remoteKind + " generation request to the configured NEXUS worker…");
      try {
        const job = await submitEngineJob(remoteKind, normalized, { aspectRatio: aiFormat, style: aiStyle, projectName, source: "nexus-ai-project-brain", projectContext: { assetCount: assets.length, clipCount: clips.length, playhead, selectedClip: selectedClip ? { id: selectedClip.id, label: selectedClip.label, start: selectedClip.start, duration: clipDuration(selectedClip) } : null, assetNames: assets.slice(0, 30).map(item => item.name) } });
        const sceneTitle = missingVisualRequest && /background|backdrop/i.test(normalized) ? "Project background · " + normalized.slice(0, 52) : normalized.slice(0, 64) || "AI generated " + remoteKind;
        setGenerationJobs(old => [{ ...job, sceneTitle }, ...old.filter(item => item.id !== job.id)]);
        setAiReply("The " + remoteKind + " job was accepted with your current project context. Its verified output will be downloaded, imported into the media library and added at the playhead or project timeline automatically when the worker finishes.");
      } catch (error) {
        setAiReply(error instanceof Error ? error.message : "The generation worker rejected this request. Your project is unchanged.");
      } finally { setGenerationBusy(null); }
      return;
    }

    const creativeCommand = interpretCreativeCommand(request);
    if (creativeCommand === "duplicate-clip") {
      if (!selectedClip) { setAiReply("Select a clip first, then ask me to duplicate it."); return; }
      const copy = { ...selectedClip, id: uid(), start: selectedClip.start + clipDuration(selectedClip), label: selectedClip.label + " copy" };
      applyClipChange([...clips, copy], "Selected clip duplicated after the original."); setSelected(copy.id); setPlayhead(copy.start); setActiveTool("edit");
      setAiReply("Duplicated “" + selectedClip.label + "” and placed the copy immediately after it. Both clips remain independently editable."); return;
    }
    if (creativeCommand === "flip-horizontal" || creativeCommand === "flip-vertical") {
      if (!selectedClip) { setAiReply("Select a visual clip first, then ask me to flip it."); return; }
      const patch = creativeCommand === "flip-horizontal" ? { flipHorizontal: !selectedClip.flipHorizontal } : { flipVertical: !selectedClip.flipVertical };
      updateSelectedClip(patch); setActiveTool("adjust");
      setAiReply("Updated the selected clip’s " + (creativeCommand === "flip-horizontal" ? "horizontal" : "vertical") + " flip. Preview and export use the same saved setting."); return;
    }
    if (creativeCommand === "chroma-key") {
      if (!selectedClip || !asset || asset.kind === "audio") { setAiReply("Select a photo or video clip first to use chroma key."); return; }
      updateSelectedClip({ chromaKeyEnabled: !selectedClip.chromaKeyEnabled, chromaKeyColor: selectedClip.chromaKeyColor || "#00ff00" });
      setActiveTool("adjust"); setActiveSubtool("chroma");
      setAiReply(selectedClip.chromaKeyEnabled ? "Chroma key turned off for the selected visual clip." : "Chroma key enabled. Adjust key colour, tolerance and softness. Preview uses an SVG approximation; export uses pixel-distance keying."); return;
    }
    const engineCommand = interpretEditorCommand(request);
    if (engineCommand.type === "analyze") { void analyzeAllMedia(); return; }
    if (engineCommand.type === "guide") { setAiReply(makeEditingGuidance(selectedClip, mediaAnalyses.find(item=>item.assetId===selectedClip?.assetId), playhead)); return; }
    const toolNames: Record<string, string> = { edit: "edit", audio: "audio", text: "text", overlay: "overlay", effects: "effects", captions: "captions", filters: "filters", adjust: "adjust", media: "media", stickers: "stickers", background: "background", ratio: "ratio", export: "export" };
    const requestedTool = Object.keys(toolNames).find(name => new RegExp("\b" + name + "\b").test(request));
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
      if (!selectedClip) { setAiReply("Select a clip first so I can unmute it."); return; }
      updateSelectedClip({ muted: false }); setMuteClip(false); setActiveTool("edit"); setActiveSubtool("volume"); setAiReply("Clip audio unmuted. This change is saved on the selected clip and will be respected by export."); return;
    }
    if (/\b(mute|silence)\b/.test(request)) {
      if (!selectedClip) { setAiReply("Select a clip first so I can mute it."); return; }
      updateSelectedClip({ muted: true }); setMuteClip(true); setActiveTool("edit"); setActiveSubtool("volume"); setAiReply("Clip audio muted on the selected clip. The mute is saved and will also apply during export."); return;
    }
    const speedMatch = request.match(/\b(?:speed|playback)\s*(?:to|at|=)?\s*(0?\.\d+|[1-4](?:\.\d+)?)\s*x?\b/);
    if (speedMatch) {
      if (!selectedClip) { setAiReply("Select a clip first so I can change its speed."); return; }
      const speed = Math.max(0.1, Math.min(4, Number(speedMatch[1])));
      updateSelectedClip({ speed }); setActiveTool("edit"); setActiveSubtool("speed");
      setAiReply("Set “" + selectedClip.label + "” to " + speed + "× speed. The clip duration and export timing will use this speed."); return;
    }
    const volumeMatch = request.match(/\b(?:volume|gain)\s*(?:to|at|=)?\s*(\d{1,3})\s*%/);
    if (volumeMatch) {
      if (!selectedClip) { setAiReply("Select a clip first so I can change its volume."); return; }
      const gain = Math.max(0, Math.min(200, Number(volumeMatch[1]))) / 100;
      updateSelectedClip({ gain }); setActiveTool("audio"); setActiveSubtool("volume");
      setAiReply("Set “" + selectedClip.label + "” volume to " + Math.round(gain * 100) + "%. This clip gain is included in export."); return;
    }
    const fadeMatch = request.match(/\b(fade\s*in|fade\s*out)\s*(?:for|over)?\s*(\d+(?:\.\d+)?)?\s*(?:seconds?|secs?|s)?\b/);
    if (fadeMatch) {
      if (!selectedClip) { setAiReply("Select a clip first so I can apply a fade."); return; }
      const seconds = Math.max(0, Math.min(10, Number(fadeMatch[2] || 1)));
      updateSelectedClip(fadeMatch[1].toLowerCase().includes("in") ? { fadeIn: seconds } : { fadeOut: seconds });
      setActiveTool("audio"); setActiveSubtool("fade");
      setAiReply("Applied a " + seconds + " second " + (fadeMatch[1].toLowerCase().includes("in") ? "fade-in" : "fade-out") + " to “" + selectedClip.label + "”. The export renderer will use it."); return;
    }
    if (/\b(delete|remove)\b/.test(request) && /\b(clip|selected)\b/.test(request)) {
      if (!selectedClip) { setAiReply("Select the clip you want to remove first."); return; }
      applyClipChange(clips.filter(c => c.id !== selectedClip.id), "Clip removed from timeline. You can undo this."); setSelected(null);
      setAiReply("Removed “" + selectedClip.label + "” from the timeline."); return;
    }
    if (/\b(add|insert|create)\b.*\b(text|title)\b|\b(text|title)\b.*\b(add|insert|create)\b/.test(request)) {
      const textMatch = aiBrief.trim().match(/(?:add|insert|create)\s+(?:a\s+)?(?:text|title)(?:\s+(?:saying|that says|:)?\s*["“]?(.+?)["”]?)?$/i);
      const content = textMatch?.[1]?.trim().replace(/^["“]|["”]$/g, "") || "Your text";
      addGraphicLayer(content.slice(0, 180));
      setActiveTool("text"); setActiveSubtool("add");
      setAiReply("Added “" + content.slice(0, 180) + "” as a real timed text layer on the timeline. Select the layer to customise its style and duration."); return;
    }
    const ratioMatch = request.match(/\b(9:16|16:9|1:1|4:5|3:4)\b/);
    if (ratioMatch && /\b(ratio|format|canvas|aspect)\b/.test(request)) {
      setAspectRatio(ratioMatch[1]); setActiveTool("ratio"); setActiveSubtool(ratioMatch[1]);
      setAiReply("Canvas ratio changed to " + ratioMatch[1] + ". The export uses this ratio too; choose an export preset or quality before rendering."); return;
    }
    if (requestedTool) {
      setActiveTool(requestedTool); setActiveSubtool(requestedTool === "edit" ? "select" : "");
      setAiReply("Opened the " + requestedTool + " tools in the editor. Its available controls are shown above the bottom dock. Some advanced operations are still under development.");
      return;
    }
    if (/\b(improve|better|suggest)\b/.test(request)) {
      setAiReply(selectedClip ? "For “" + selectedClip.label + "”, start by trimming any unwanted beginning/end, keep cuts aligned to the beat, then balance the audio. I can execute split, mute/unmute, speed, clip volume, fades, timed text creation and ratio changes; advanced operations still need their own connected engine." : "Import and select a clip first. Then I can give advice based on that clip and your timeline.");
      return;
    }
    if (/\bundo\b/.test(request)) { undoEdit(); setAiReply("Undo command sent. Check the timeline to confirm the restored edit."); return; }
    if (/\bredo\b/.test(request)) { redoEdit(); setAiReply("Redo command sent. Check the timeline to confirm the edit."); return; }
    setAiReply("I can run supported local editor actions without a generation worker: split or delete the selected clip, mute/unmute its exported audio, set speed (for example “speed 2x”), set volume (for example “volume 80%”), apply fades (for example “fade in 2 seconds”), add timed text, change the canvas ratio, analyse media, or guide the next edit.");
  }
  async function openProject(file?: File) {
    if (!file) return;
    try {
      const p = parseProject(await file.text());
      assets.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
      setAssets([]);
      setPendingProjectAssets(p.assets as MediaAsset[]);
      setProjectName(p.name); setClips(p.clips); setTextLayers(p.textLayers || []); setImageLayers(p.imageLayers || []); setSelectedImageLayer(null);
      setSelected(null); setSelectedTextLayer(null); setBeatMarkers([]);
      setTrackStates(p.tracks?.length ? p.tracks : defaultTracks);
      setTrackMix(Object.fromEntries((p.tracks||[]).filter(track=>track.kind==="audio").map(track=>[track.id,{volume:track.volume??1,pan:track.pan??0,solo:track.solo??false,muted:track.muted??false}])));
      setStatus(p.assets.length ? "Project opened · re-import the original media files to relink them automatically by filename and media type" : "Project opened · no external media files are required");
      setPage("editor");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open this project file");
    }
  }
  function startNewProject() {
    assets.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
    setProjectName("Untitled Project"); setAssets([]); setPendingProjectAssets([]);
    setClips([]); setTextLayers([]); setImageLayers([]); setSelected(null);
    setSelectedTextLayer(null); setSelectedImageLayer(null); setSelectedImageAssetId("");
    setUndoStack([]); setRedoStack([]); setTrackStates(defaultTracks.map(track => ({ ...track, locked: false })));
    setTrackMix({}); setBeatMarkers([]); setPlayhead(0); setAspectRatio("9:16");
    setPage("editor"); setEditorView("workspace"); setActiveTool("edit"); setActiveSubtool("select");
    setStatus("New project ready · import your media to begin.");
  }
  function applyCreativeTemplate(template: typeof CREATIVE_TEMPLATES[number]) {
    const duration = template.seconds;
    const layers: TimelineTextLayer[] = [
      { id: uid(), trackId: "text-1", start: 0, duration, text: template.title, color: "#ffffff", fontSize: 58, fontFamily: "Arial", x: 50, y: 34, align: "center", shadow: true, animation: "pop", backgroundColor: "transparent", padding: 8 },
      { id: uid(), trackId: "text-1", start: 0.35, duration: Math.max(1, duration - 0.35), text: template.subtitle, color: "#ffffff", fontSize: 29, fontFamily: "Arial", x: 50, y: 52, align: "center", shadow: true, animation: "fade", backgroundColor: "transparent", padding: 8 },
      { id: uid(), trackId: "text-1", start: 0.7, duration: Math.max(1, duration - 0.7), text: template.footer, color: template.accent, fontSize: 19, fontFamily: "Arial", x: 50, y: 84, align: "center", shadow: true, animation: "fade", backgroundColor: "transparent", padding: 6 }
    ];
    setProjectName(template.name); setAspectRatio(template.ratio);
    setTextLayers(old => [...old, ...layers]);
    if (clips.length) applyClipChange(clips.map(clip => assets.find(item => item.id === clip.assetId)?.kind === "audio" ? clip : ({ ...clip, filter: template.filter, transitionIn: clip.transitionIn ?? 0.45, transitionOut: clip.transitionOut ?? 0.45, transitionStyle: clip.transitionStyle || "fade" })), "Creative template applied to the current visual timeline.");
    setSelectedTextLayer(layers[0].id); setOverlayText(template.title); setTextColor("#ffffff"); setTextSize(58); setTextFont("Arial");
    setPlayhead(0); setPage("editor"); setEditorView("workspace"); setActiveTool("text"); setActiveSubtool("template");
    setStatus("“" + template.name + "” applied: editable title, subtitle and footer layers added. Import your footage or photos, then replace the placeholder text.");
  }
  function applyCreativeEffect(effect: typeof CREATIVE_EFFECTS[number]) {
    if (!selectedClip) { setStatus("Select a video or image clip before applying an effect."); return; }
    updateSelectedClip(effect.patch);
    setActiveSubtool(effect.name);
    setStatus(effect.name + " applied to “" + selectedClip.label + "”. Adjust its individual controls to fine-tune the look.");
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
  const templates = CREATIVE_TEMPLATES;
  const effectItems = [...FILTER_PRESETS.slice(0, 50).map(name => ({ name, category: "Film" })), ...CREATIVE_FILTERS];
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
          <button className="quick-card" onClick={startNewProject}><span className="quick-icon purple"><Plus/></span><b>New project</b><small>Start from scratch</small></button>
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
            <div className="ai-studio-compose"><textarea value={aiBrief} onChange={e=>setAiBrief(e.target.value)} placeholder="Describe your video idea, audience, message or visual style..." rows={3}/><button onClick={()=>{
              const message=aiBrief.trim(); if(!message)return;
              setAiChatMessages(old=>[...old,{role:"user",text:message}]);
              if(!aiPlan){void (async()=>{await createAIProjectPlan(message);setAiChatMessages(old=>[...old,{role:"assistant",text:"Storyboard planning finished. Review the scenes before approval. The connected AI Director is used when configured; otherwise NEXUS clearly labels its local fallback."}]);})();}
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
          <div className="editor-project-title"><b>{projectName}</b><small>{editorView==="workspace"?"Editing workspace":editorView==="import"?"Media library":"Export project"} · {draftSaveStatus}</small></div>
          <button className={"editor-top-icon ai-editor-trigger"+(aiWorkspaceOpen?" active":"")} onClick={()=>setAiWorkspaceOpen(v=>!v)} title="Toggle NEXUS AI guidance"><Sparkles size={18}/><span>AI</span></button><button className="editor-top-icon" onClick={()=>void saveCurrentProject()} title="Save project"><Check size={18}/></button>
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
              <button onClick={()=>void openNativeMediaPicker(["image/*","video/*"],mediaInput)}><span className="attachment-option-icon photos"><ImageIcon size={23}/></span><b>Photos & Videos</b><small>Open your gallery</small></button>
              <button onClick={()=>void openNativeMediaPicker(["audio/*"],audioInput)}><span className="attachment-option-icon audio"><Music2 size={23}/></span><b>Audio</b><small>Choose music or sound</small></button>
              <button onClick={()=>void openNativeMediaPicker(["image/*","video/*","audio/*"],filesInput)}><span className="attachment-option-icon files"><FolderOpen size={23}/></span><b>Browse files</b><small>Choose from device storage</small></button>
            </div>
          </section>
        </div>}
        {editorView==="workspace" && <div className="editor-screen">
          <div className="editor-preview-zone">
            <div className="editor-preview-meta"><span>PREVIEW · {previewClip?.label || "No active clip at playhead"}</span><div className="preview-meta-actions"><button onClick={()=>setShowAttachmentPicker(true)} className="preview-add-media"><Plus size={14}/> Add media</button><select aria-label="Choose image for sticker layer" value={selectedImageAssetId} onChange={e=>setSelectedImageAssetId(e.target.value)}><option value="">Image asset…</option>{assets.filter(item=>item.kind==="image").map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={!selectedImageAssetId} onClick={addImageLayer}><Sticker size={14}/> Add sticker</button><button onClick={()=>{setActiveTool("adjust");setActiveSubtool("Position");}}><SlidersHorizontal size={14}/> Adjust</button></div></div>
            <div className={"editor-preview-frame ratio-frame ratio-"+aspectRatio.replace(":","-")}>
              <svg aria-hidden="true" width="0" height="0" style={{position:"absolute"}}><defs>{activeTimelineClips.filter(item=>item.chromaKeyEnabled).map(item=><filter key={item.id} id={"nexus-chroma-"+item.id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={getChromaSvgMatrix(item.chromaKeyColor||"#00ff00",item.chromaKeyTolerance??70,item.chromaKeySoftness??28)}/></filter>)}</defs></svg>
              {previewAsset?.kind==="video"&&previewAsset.objectUrl?<video ref={video} src={previewAsset.objectUrl} controls playsInline onTimeUpdate={e=>{if(previewClip){const el=e.currentTarget;setPlayhead(previewClip.start+clipTimelineAtSource(previewClip,el.currentTime));}}} muted={muteClip || !!previewClip?.muted} style={{filter: visualFilter(previewClip) + (previewAnimated.transitionBlur ? ` blur(${previewAnimated.transitionBlur}px)` : "") + (previewClip?.chromaKeyEnabled ? ` url(#nexus-chroma-${previewClip.id})` : ""), opacity: previewAnimated.opacity * previewAnimated.transitionAlpha * (trackStates.find(item=>item.id===previewClip?.trackId)?.opacity??1), mixBlendMode: (trackStates.find(item=>item.id===previewClip?.trackId)?.blendMode??"normal") as CSSProperties["mixBlendMode"], transform: `translate(${previewAnimated.offsetX + previewAnimated.slide}%, ${previewAnimated.offsetY}%) rotate(${previewAnimated.rotation}deg) scale(${previewAnimated.zoom * previewAnimated.zoomBoost}%) scaleX(${previewClip?.flipHorizontal ? -1 : 1}) scaleY(${previewClip?.flipVertical ? -1 : 1})`, transformOrigin: "center", objectFit: previewClip?.fit === "contain" ? "contain" : "cover", clipPath: previewClip?.maskShape==="circle"?"ellipse(50% 50% at 50% 50%)":previewClip?.maskShape==="rounded"?`inset(0 round ${previewClip?.maskRadius ?? 12}%)`:previewClip?.maskShape==="horizontal"?"inset(25% 0)":previewClip?.maskShape==="vertical"?"inset(0 25%)":previewClip?.maskShape==="diamond"?"polygon(50% 0, 100% 50%, 50% 100%, 0 50%)":previewClip?.maskShape==="hexagon"?"polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)":previewClip?.maskShape==="star"?"polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 93%, 50% 71%, 21% 93%, 32% 57%, 2% 35%, 39% 35%)":previewAnimated.wipe<1?`inset(0 ${(1-previewAnimated.wipe)*100}% 0 0)`:"none"}}/>:previewAsset?.kind==="image"&&previewAsset.objectUrl?<img src={previewAsset.objectUrl} alt="Selected media preview" style={{filter: visualFilter(previewClip) + (previewAnimated.transitionBlur ? ` blur(${previewAnimated.transitionBlur}px)` : ""), opacity: previewAnimated.opacity * previewAnimated.transitionAlpha * (trackStates.find(item=>item.id===previewClip?.trackId)?.opacity??1), mixBlendMode: (trackStates.find(item=>item.id===previewClip?.trackId)?.blendMode??"normal") as CSSProperties["mixBlendMode"], transform: `translate(${previewAnimated.offsetX + previewAnimated.slide}%, ${previewAnimated.offsetY}%) rotate(${previewAnimated.rotation}deg) scale(${previewAnimated.zoom * previewAnimated.zoomBoost}%) scaleX(${previewClip?.flipHorizontal ? -1 : 1}) scaleY(${previewClip?.flipVertical ? -1 : 1})`, transformOrigin: "center", clipPath: previewClip?.maskShape==="circle"?"ellipse(50% 50% at 50% 50%)":previewClip?.maskShape==="rounded"?`inset(0 round ${previewClip?.maskRadius ?? 12}%)`:previewClip?.maskShape==="horizontal"?"inset(25% 0)":previewClip?.maskShape==="vertical"?"inset(0 25%)":previewAnimated.wipe<1?`inset(0 ${(1-previewAnimated.wipe)*100}% 0 0)`:"none"}}/>:<div className="editor-preview-empty"><div className="preview-n">N</div><b>Your story starts here</b><small>Import media to begin editing</small><button onClick={()=>setShowAttachmentPicker(true)}><Plus size={16}/> Import media</button></div>}
              {activeTimelineClips.filter(clip=>clip.id!==previewClip?.id && assets.some(item=>item.id===clip.assetId && item.kind!=="audio")).map(layerClip=>{
                const layerAsset=assets.find(item=>item.id===layerClip.assetId); if(!layerAsset?.objectUrl)return null;
                const motion=getPreviewLayerMotion(layerClip);
                const blendModes:Record<string,CSSProperties["mixBlendMode"]>={normal:"normal",multiply:"multiply",screen:"screen",overlay:"overlay",darken:"darken",lighten:"lighten","soft-light":"soft-light","hard-light":"hard-light"};
                const mask=layerClip.maskShape==="circle"?"ellipse(50% 50% at 50% 50%)":layerClip.maskShape==="rounded"?`inset(0 round ${layerClip.maskRadius??12}%)`:layerClip.maskShape==="horizontal"?"inset(25% 0)":layerClip.maskShape==="vertical"?"inset(0 25%)":"none";
                const wipe=motion.wipe<1?`inset(0 ${(1-motion.wipe)*100}% 0 0)`:mask;
                const layerStyle:CSSProperties={position:"absolute",inset:0,width:"100%",height:"100%",objectFit:layerClip.fit==="contain"?"contain":"cover",opacity:motion.opacity*motion.alpha*(trackStates.find(item=>item.id===layerClip.trackId)?.opacity??1),filter:visualFilter(layerClip)+(motion.blur?` blur(${motion.blur}px)`:"")+(layerClip.chromaKeyEnabled?` url(#nexus-chroma-${layerClip.id})`:""),transform:`translate(${motion.offsetX+motion.slide}%, ${motion.offsetY}%) rotate(${motion.rotation}deg) scale(${motion.zoom*motion.zoomBoost}%) scaleX(${layerClip.flipHorizontal?-1:1}) scaleY(${layerClip.flipVertical?-1:1})`,transformOrigin:"center",mixBlendMode:blendModes[trackStates.find(item=>item.id===layerClip.trackId)?.blendMode||layerClip.blendMode||"normal"],pointerEvents:"none",clipPath:wipe};
                return layerAsset.kind==="image"?<img key={layerClip.id} src={layerAsset.objectUrl} alt="" aria-hidden="true" style={layerStyle}/>:<video key={layerClip.id} src={layerAsset.objectUrl} muted playsInline autoPlay onLoadedMetadata={event=>{try{event.currentTarget.currentTime=clipSourceAtTimeline(layerClip,Math.max(0,playhead-layerClip.start));}catch{}}} style={layerStyle}/>;
              })}
              {!!previewClip?.vignette && <div aria-hidden="true" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,background:`radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,${Math.max(0,Math.min(100,previewClip.vignette))/100*.82}) 100%)`}}/>}
              {imageLayers.filter(layer=>layer.visible && playhead>=layer.start && playhead<layer.start+layer.duration && !trackStates.find(track=>track.id===layer.trackId)?.hidden).map(layer=>{const image=assets.find(item=>item.id===layer.assetId);if(!image?.objectUrl)return null;return <img key={layer.id} src={image.objectUrl} alt="" aria-hidden="true" onClick={()=>setSelectedImageLayer(layer.id)} style={{position:"absolute",left:layer.fit==="cover"?"0":layer.x+"%",top:layer.fit==="cover"?"0":layer.y+"%",width:layer.fit==="cover"?"100%":(50*layer.scale)+"%",height:layer.fit==="cover"?"100%":"auto",maxHeight:layer.fit==="cover"?"none":"90%",objectFit:layer.fit||"contain",opacity:layer.opacity,transform:layer.fit==="cover"?"none":`translate(-50%,-50%) rotate(${layer.rotation}deg)`,pointerEvents:"auto",outline:selectedImageLayer===layer.id?"1px solid #38bdf8":"none",zIndex:layer.fit==="cover"?0:8}}/>;})}{visibleTextLayers.map((layer,index)=><div key={layer.id} className="nexus-text-overlay" style={{...getGraphicsFallbackStyle(layer.text,layer.color,layer.fontSize,layer.fontFamily),opacity:layer.opacity??1,left:(layer.x??50)+"%",top:(layer.y??50)+"%",transform:`translate(-50%, -50%) rotate(${layer.rotation||0}deg)`,textAlign:layer.align||"center",background:layer.backgroundColor||"transparent",padding:(layer.padding||0)+"px",mixBlendMode:(layer.blendMode||"normal") as CSSProperties["mixBlendMode"],textShadow:layer.shadow===false?"none":undefined,zIndex:10+index}}>{layer.text}</div>)}{!visibleTextLayers.length && activeTool==="text" && !textLayers.length && <div className="nexus-text-overlay" style={getGraphicsFallbackStyle(overlayText,textColor,textSize,textFont)}>{overlayText||"Type your text"}</div>}
              {previewAsset?.kind==="audio" && previewAsset.objectUrl && <audio ref={audioPreview} src={previewAsset.objectUrl} controls muted={muteClip || !!previewClip?.muted} style={{width:"90%",maxWidth:420}}/>}
            </div>
            {selectedImageLayer && (()=>{const layer=imageLayers.find(item=>item.id===selectedImageLayer);return layer?<div className="editor-transport image-layer-controls"><span>IMAGE LAYER</span><label>Start (s) <input type="number" min="0" max={Math.max(0,duration)} step="0.1" value={layer.start} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({start:Math.max(0,Math.min(duration,Number(e.target.value)||0))})}/></label><label>Duration (s) <input type="number" min="0.1" max="600" step="0.1" value={layer.duration} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({duration:Math.max(0.1,Math.min(600,Number(e.target.value)||0.1))})}/></label><label>X <input type="range" min="0" max="100" value={layer.x} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({x:Number(e.target.value)})}/></label><label>Y <input type="range" min="0" max="100" value={layer.y} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({y:Number(e.target.value)})}/></label><label>Scale <input type="range" min="0.1" max="2.5" step="0.05" value={layer.scale} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({scale:Number(e.target.value)})}/></label><label>Rotation <input type="range" min="-180" max="180" value={layer.rotation} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({rotation:Number(e.target.value)})}/></label><label>Opacity <input type="range" min="0" max="1" step="0.05" value={layer.opacity} disabled={layer.locked} onChange={e=>updateSelectedImageLayer({opacity:Number(e.target.value)})}/></label><button onClick={()=>reorderSelectedImageLayer(-1)}>Back</button><button onClick={()=>reorderSelectedImageLayer(1)}>Forward</button><button onClick={()=>updateSelectedImageLayer({visible:!layer.visible})}>{layer.visible?"Hide":"Show"}</button><button onClick={()=>updateSelectedImageLayer({locked:!layer.locked})}>{layer.locked?"Unlock":"Lock"}</button><button disabled={layer.locked||generationBusy!==null} onClick={regenerateSelectedImageLayer}>Regenerate / replace</button><button disabled={layer.locked} onClick={()=>{recordProjectHistory();setImageLayers(old=>old.filter(item=>item.id!==layer.id));setSelectedImageLayer(null);}}>Delete</button></div>:null;})()}<div className="editor-transport"><button onClick={()=>{if(video.current){video.current.currentTime=Math.max(0,video.current.currentTime-1);setPlayhead(Math.max(0,playhead-1));}}}>−1s</button><button className="editor-play" onClick={()=>{if(video.current){if(video.current.paused)void video.current.play();else video.current.pause();}}}><Play size={17} fill="currentColor"/></button><button onClick={()=>{if(video.current){video.current.currentTime+=1;setPlayhead(video.current.currentTime);}}}>+1s</button><span>{clock(playhead)} / {clock(duration)}</span></div>
          </div>
          <div className="editor-timeline-zone">
            <div className="editor-timeline-head"><div><b>Timeline</b><small>{clips.length} clips · {clock(duration)} · Drag clips to move · Tap lanes to seek</small></div><div className="editor-timeline-actions"><button onClick={()=>setTimelineZoom(v=>Math.max(24,v-12))} title="Zoom out">−</button><button onClick={()=>setTimelineZoom(v=>Math.min(140,v+12))} title="Zoom in">＋</button><button onClick={()=>{const viewport=timelineScrollRef.current;if(viewport){setTimelineZoom(Math.max(24,Math.min(140,(viewport.clientWidth-65)/Math.max(duration,10))));viewport.scrollTo({left:0,behavior:"smooth"});}}} title="Fit full timeline">Fit</button><button onClick={split} title="Split"><Scissors size={16}/></button><button disabled={!selectedClip} onClick={()=>{applyClipChange(clips.filter(c=>c.id!==selected), "Clip deleted");setSelected(null);}} title="Delete"><Trash2 size={16}/></button><button onClick={undoEdit} disabled={!undoStack.length} title="Undo"><ArrowLeft size={16}/></button><button onClick={redoEdit} disabled={!redoStack.length} title="Redo"><Command size={16}/></button></div></div>
            <div className="editor-timeline-scroll" ref={timelineScrollRef} onPointerMove={e=>{const layerDrag=timelineLayerDrag.current;if(layerDrag){const nextStart=Math.max(0,layerDrag.originalStart+(e.clientX-layerDrag.startX)/timelineZoom);if(layerDrag.kind==="image")setImageLayers(old=>old.map(item=>item.id===layerDrag.id?{...item,start:nextStart}:item));else setTextLayers(old=>old.map(item=>item.id===layerDrag.id?{...item,start:nextStart}:item));return;}const drag=trimClipDrag.current;if(!drag)return;const delta=(e.clientX-drag.startX)/timelineZoom;const updated=clips.map(item=>{if(item.id!==drag.id)return item;if(drag.edge==="start"){const nextStart=Math.max(0,Math.min(drag.clip.start+clipDuration(drag.clip)-0.15,drag.clip.start+delta));const sourceDelta=delta>=0?clipSourceAtTimeline(drag.clip,nextStart-drag.clip.start)-drag.clip.sourceIn:delta*Math.max(.1,drag.clip.speed||1);return {...item,start:nextStart,sourceIn:Math.max(drag.clip.sourceIn,Math.min(drag.clip.sourceOut-0.05,drag.clip.sourceIn+sourceDelta))};}const sourceDuration=assets.find(media=>media.id===drag.clip.assetId)?.duration||drag.clip.sourceOut;const nextSource=clipSourceAtTimeline(drag.clip,Math.max(0,clipDuration(drag.clip)+delta));const nextOut=Math.max(drag.clip.sourceIn+0.05,Math.min(sourceDuration,nextSource));return {...item,sourceOut:nextOut};});setClips(updated);}} onPointerUp={e=>{const layerDrag=timelineLayerDrag.current;if(layerDrag){timelineLayerDrag.current=null;const moved=Math.abs(e.clientX-layerDrag.startX)>4;if(moved){setUndoStack(old=>[...old.slice(-49),{...captureProjectSnapshot(),imageLayers:layerDrag.originalImages,textLayers:layerDrag.originalTexts}]);setRedoStack([]);setStatus((layerDrag.kind==="image"?"Image":"Text")+" layer moved to "+clock(Math.max(0,layerDrag.originalStart+(e.clientX-layerDrag.startX)/timelineZoom))+".");}return;}const trim=trimClipDrag.current;if(trim){trimClipDrag.current=null;const current=clips.find(item=>item.id===trim.id);if(current){setUndoStack(old=>[...old.slice(-49),{...captureProjectSnapshot(),clips:trim.allClips}]);setRedoStack([]);setStatus("Clip edge trimmed.");}return;}const drag=touchClipDrag.current;if(!drag)return;touchClipDrag.current=null;if(Date.now()-drag.startedAt<250||Math.abs(e.clientX-drag.startX)<8)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".editor-lane") as HTMLElement|null;const current=clips.find(item=>item.id===drag.id);if(!current)return;const rect=target?.getBoundingClientRect();const rawStart=rect?Math.max(0,(e.clientX-rect.left+(timelineScrollRef.current?.scrollLeft||0))/timelineZoom-drag.grabOffset):Math.max(0,current.start+(e.clientX-drag.startX)/timelineZoom);const nextStart=snapTimelineTime(rawStart,drag.id);const nextTrack=target?.dataset.trackId||current.trackId;const targetTrack=trackStates.find(item=>item.id===nextTrack);if(targetTrack?.locked){setStatus("That track is locked. Unlock it before moving clips there.");return;}applyClipChange(clips.map(item=>item.id===drag.id?{...item,trackId:nextTrack,start:nextStart}:item),"Clip moved on the timeline.");}} onPointerCancel={()=>{trimClipDrag.current=null;touchClipDrag.current=null;timelineLayerDrag.current=null;}}><div className="editor-timeline-ruler" style={{width:timelineWidth,marginLeft:65}}>{Array.from({length:Math.max(5,Math.ceil(duration/5)+1)},(_,i)=>i*5).map(t=><span key={t} style={{flex:"0 0 "+(timelineZoom*5)+"px"}}>{clock(t)}</span>)}</div>
              <div className="editor-timeline-rows" style={{width:timelineWidth+65}}><div className="editor-lane-labels">{activeTrackStates.map((track,index)=><span key={track.id} className={track.kind==="audio"?"audio-lane-label":""}><b>{track.name}</b><small>{track.kind}</small><span className="editor-track-controls"><button title={track.hidden?"Show track":"Hide track"} aria-label={track.hidden?"Show "+track.name:"Hide "+track.name} onClick={()=>setTrackStates(old=>old.map(item=>item.id===track.id?{...item,hidden:!item.hidden}:item))}>{track.hidden?"◉":"◎"}</button>{track.kind==="audio"&&<button title={track.muted?"Unmute track":"Mute track"} aria-label={track.muted?"Unmute "+track.name:"Mute "+track.name} onClick={()=>setTrackStates(old=>old.map(item=>item.id===track.id?{...item,muted:!item.muted}:item))}>{track.muted?"🔇":"🔊"}</button>}<button title={track.locked?"Unlock track":"Lock track"} aria-label={track.locked?"Unlock "+track.name:"Lock "+track.name} onClick={()=>setTrackStates(old=>old.map(item=>item.id===track.id?{...item,locked:!item.locked}:item))}>{track.locked?"🔒":"🔓"}</button><button title="Move track up" aria-label={"Move "+track.name+" up"} disabled={index===0} onClick={()=>setTrackStates(old=>{const next=[...old];const current=next.findIndex(item=>item.id===track.id);const neighbor=activeTrackStates[index-1];const target=neighbor?next.findIndex(item=>item.id===neighbor.id):-1;if(current<0||target<0)return old;[next[current],next[target]]=[next[target],next[current]];return next;})}>↑</button><button title="Move track down" aria-label={"Move "+track.name+" down"} disabled={index===activeTrackStates.length-1} onClick={()=>setTrackStates(old=>{const next=[...old];const current=next.findIndex(item=>item.id===track.id);const neighbor=activeTrackStates[index+1];const target=neighbor?next.findIndex(item=>item.id===neighbor.id):-1;if(current<0||target<0)return old;[next[current],next[target]]=[next[target],next[current]];return next;})}>↓</button>{track.kind!=="audio"&&<><input aria-label={track.name+" opacity"} title="Track opacity" type="range" min="0" max="1" step="0.05" value={track.opacity??1} onChange={e=>setTrackStates(old=>old.map(item=>item.id===track.id?{...item,opacity:Number(e.target.value)}:item))}/><select aria-label={track.name+" blend mode"} title="Track blend mode" value={track.blendMode??"normal"} onChange={e=>setTrackStates(old=>old.map(item=>item.id===track.id?{...item,blendMode:e.target.value as TimelineTrack["blendMode"]}:item))}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="soft-light">Soft light</option><option value="hard-light">Hard light</option></select></>}</span></span>)}</div><div className="editor-lanes" onClick={e=>{if((e.target as HTMLElement).closest("button"))return;const rect=e.currentTarget.getBoundingClientRect();setPlayhead(Math.max(0,Math.min(duration,(e.clientX-rect.left+(timelineScrollRef.current?.scrollLeft||0))/timelineZoom)));}}><div className="editor-lanes-inner" style={{width:timelineWidth}}>
                {activeTrackStates.map((track,i)=>{const id=track.id;return <div className={"editor-lane"+(track.hidden?" editor-lane-hidden":"")} key={id} data-track-id={id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(track.locked)return;const payload=e.dataTransfer.getData("text/nexus-clip");let clipId=payload,grabOffset=0;try{const parsed=JSON.parse(payload);clipId=parsed.id;grabOffset=Number(parsed.grabOffset)||0;}catch{}const rect=e.currentTarget.getBoundingClientRect();const rawStart=Math.max(0,(e.clientX-rect.left+(timelineScrollRef.current?.scrollLeft||0))/timelineZoom-grabOffset);const nextStart=snapTimelineTime(rawStart,clipId);if(clipId)applyClipChange(clips.map(item=>item.id===clipId?{...item,trackId:id,start:nextStart}:item),"Clip moved to "+id+" at "+clock(nextStart));}}>{clips.filter(c=>c.trackId===id).map(c=><button key={c.id} draggable={!track.locked} className={selected===c.id?"editor-clip active":"editor-clip"} style={{left:c.start*timelineZoom,width:Math.max(70,clipDuration(c)*timelineZoom)}} onPointerDown={e=>{if(track.locked)return;if(e.pointerType==="touch"){const rect=e.currentTarget.getBoundingClientRect();touchClipDrag.current={id:c.id,startX:e.clientX,startedAt:Date.now(),grabOffset:(e.clientX-rect.left)/timelineZoom};}}} onContextMenu={e=>e.preventDefault()} onDragStart={e=>{if(track.locked){e.preventDefault();return;}const rect=e.currentTarget.getBoundingClientRect();e.dataTransfer.setData("text/nexus-clip",JSON.stringify({id:c.id,grabOffset:(e.clientX-rect.left)/timelineZoom}));e.dataTransfer.effectAllowed="move";}} onClick={()=>{setSelected(c.id);setPlayhead(c.start);const item=assets.find(x=>x.id===c.assetId);if(item?.kind==="video"&&video.current)video.current.src=item.objectUrl||"";if(item?.kind==="audio"&&audioPreview.current)audioPreview.current.src=item.objectUrl||"";setClipGain(c.gain ?? 1);}}><span className="editor-trim-handle editor-trim-start" role="button" aria-label={"Trim start of "+c.label} onPointerDown={e=>{e.stopPropagation();e.preventDefault();if(track.locked)return;e.currentTarget.setPointerCapture(e.pointerId);trimClipDrag.current={id:c.id,edge:"start",startX:e.clientX,clip:c,allClips:clips};setSelected(c.id);}}/><span className="editor-clip-title">{c.label}</span>{assets.find(item=>item.id===c.assetId)?.kind==="audio" && mediaAnalyses.find(item=>item.assetId===c.assetId)?.audio?.waveform && <span className="editor-audio-waveform" aria-label="Analysed audio waveform">{mediaAnalyses.find(item=>item.assetId===c.assetId)!.audio!.waveform!.slice(0,32).map((peak,index)=><i key={index} style={{height:Math.max(3,Math.round(peak*20))+"px"}}/>)}</span>}<span className="editor-trim-handle editor-trim-end" role="button" aria-label={"Trim end of "+c.label} onPointerDown={e=>{e.stopPropagation();e.preventDefault();if(track.locked)return;e.currentTarget.setPointerCapture(e.pointerId);trimClipDrag.current={id:c.id,edge:"end",startX:e.clientX,clip:c,allClips:clips};setSelected(c.id);}}/></button>)}{id==="image-1"&&imageLayers.map(layer=><button key={layer.id} className={selectedImageLayer===layer.id?"editor-clip active":"editor-clip"} style={{left:layer.start*timelineZoom,width:Math.max(70,layer.duration*timelineZoom),background:layer.visible?"linear-gradient(90deg,#28a7b8,#17677e)":"#52525b"}} onPointerDown={e=>{if(layer.locked)return;timelineLayerDrag.current={kind:"image",id:layer.id,startX:e.clientX,originalStart:layer.start,originalImages:imageLayers,originalTexts:textLayers};setSelectedImageLayer(layer.id);setSelectedTextLayer(null);}} onClick={()=>{setSelectedImageLayer(layer.id);setSelectedTextLayer(null);setPlayhead(layer.start);}}>{layer.visible?"▧ ":"◌ "}{assets.find(item=>item.id===layer.assetId)?.name||"Image layer"}</button>)}{id==="text-1"&&textLayers.map(layer=><button key={layer.id} className={selectedTextLayer===layer.id?"editor-clip active":"editor-clip"} style={{left:layer.start*timelineZoom,width:Math.max(70,layer.duration*timelineZoom),background:layer.visible===false?"#52525b":"linear-gradient(90deg,#9b73ff,#6449b8)",opacity:layer.visible===false?.55:1}} onPointerDown={e=>{if(layer.locked)return;timelineLayerDrag.current={kind:"text",id:layer.id,startX:e.clientX,originalStart:layer.start,originalImages:imageLayers,originalTexts:textLayers};setSelectedTextLayer(layer.id);setSelectedImageLayer(null);}} onClick={()=>{setSelectedTextLayer(layer.id);setPlayhead(layer.start);setOverlayText(layer.text);setTextColor(layer.color);setTextSize(layer.fontSize);setTextFont(layer.fontFamily);setActiveTool("text");}}>{layer.visible===false?"◌ ":""}{layer.text}</button>)}</div>;})}
                <div className="editor-playhead" style={{left:playhead*timelineZoom}}/>
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
              <button className="nexus-ai-plan-button" onClick={() => void createAIProjectPlan()}><Sparkles size={15}/> Create editable project plan</button>
              <div className="nexus-ai-online-search">
                <b>Find media online</b>
                <div><input value={mediaSearchQuery} onChange={e=>setMediaSearchQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")findOnlineMedia();}} placeholder="Search a scene or subject…"/><button disabled={mediaSearchBusy} onClick={()=>findOnlineMedia()}>{mediaSearchBusy?"Searching…":"Search"}</button></div>
                <small>{mediaSearchStatus || "Search Wikimedia Commons for openly licensed images and video files. Review the licence before using any result."}</small>
                {mediaSearchResults.map(item=><article key={item.id}><img src={item.thumbnailUrl} alt=""/><span><b>{item.title}</b><small>{item.mediaKind.toUpperCase()} · {item.license} · {item.creator || "Creator not listed"}</small><small>{item.attribution || "Check source attribution requirements"}</small><button onClick={()=>addSourcedImage(item)}>Add to media library</button><a href={item.pageUrl} target="_blank" rel="noreferrer">View source and licence</a></span></article>)}
              </div>
              {mediaAnalyses.length>0 && <div className="nexus-ai-analysis-results"><b>Media analysis · {mediaAnalyses.length} assets</b>{mediaAnalyses.map(item=><article key={item.assetId}><b>{item.name}</b><small>{item.kind.toUpperCase()} · {item.duration.toFixed(1)}s · {item.width?item.width+"×"+item.height:"dimensions unavailable"} · {(item.fileSize/1048576).toFixed(1)} MB</small>{item.audio&&<small>Audio RMS {(item.audio.rms*100).toFixed(1)}% · estimated silence {(item.audio.silenceRatio*100).toFixed(0)}% · {item.audio.beatCandidates.length} transient candidates</small>}{item.visual&&<small>{item.visual.sampledFrames} visual samples · {item.visual.sceneChanges.length} brightness-change candidates · average brightness {(item.visual.averageLuminance*100).toFixed(0)}%</small>}<small>{item.notes.join(" ")}</small></article>)}</div>}{engineReport.length>0&&<div className="nexus-ai-analysis-results"><b>Project verification</b>{engineReport.map((line,i)=><small key={i}>{line}</small>)}</div>}
              {aiPlan && <div className="nexus-ai-storyboard">
                {aiPlan.scenes.map((scene,index)=><article key={scene.title}><b>{index+1}. {scene.title}</b><p>{scene.visual}</p><small>Search for: {scene.searchTerms.join(" · ")}</small><small>Fallback: {scene.fallback}</small></article>)}
                <p className="nexus-ai-sourcing-note">{aiPlan.sourcingNote}</p>
                <div className="nexus-ai-generation-actions">{aiPlan.scenes.map((scene,index)=><div key={scene.title+"-"+index}><b>{scene.title}</b><div><button disabled={generationBusy!==null} onClick={()=>generateSceneMedia(scene,"image")}>Generate image</button><button disabled={generationBusy!==null} onClick={()=>generateSceneMedia(scene,"video")}>Generate video</button></div></div>)}</div>
                {generationJobs.length>0&&<div className="nexus-ai-analysis-results"><b>Generation jobs</b>{generationJobs.map(job=><div key={job.id}><small>{job.sceneTitle} · {job.engine} · {job.state} · {Math.round(job.progress||0)}%</small><small>{job.message||job.error||"Waiting for worker update"}</small>{!job.id.startsWith("unavailable-")&&job.state!=="succeeded"&&job.state!=="failed"&&job.state!=="cancelled"&&<button onClick={()=>refreshGenerationJob(job)}>Refresh status</button>}</div>)}</div>}
                <button className="nexus-ai-plan-button" onClick={buildAIProjectTimeline}>Build editable timeline</button>
              </div>}
            </div>}
            <div className="nexus-ai-inline-compose"><input value={aiBrief} onChange={e=>setAiBrief(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runAICommand();}} placeholder="Ask about your edit or give an editing command…"/><button onClick={runAICommand}><Sparkles size={16}/> Ask</button></div>
            <p className="nexus-ai-reply" aria-live="polite">{aiReply}</p><small className="nexus-ai-context-status" title={aiContextSummary}>{aiContextStatus}</small>
          </div>}
          <div className="editor-bottom-tools nexus-tool-stack">
            <div className="nexus-subtool-ribbon">
              {activeTool==="edit" && <>{[["select","Select"],["split","Split"],["volume","Mute clip"],["speed","Speed"],["animation","Animation"],["cover","Fit"],["delete","Delete"]].map(([id,label])=><button key={id} className={activeSubtool===id?"active":""} disabled={id!=="split"&&id!=="volume"&&id!=="delete"&&!selectedClipForTools} onClick={()=>{setActiveSubtool(id);if(id==="split")split();if(id==="volume"&&selectedClipForTools)updateSelectedClip({muted:!selectedClipForTools.muted});if(id==="delete"&&selectedClipForTools){applyClipChange(clips.filter(c=>c.id!==selected), "Clip deleted");setSelected(null);}if(id==="speed"&&selectedClipForTools)setStatus("Use the speed presets and slider below to adjust this clip.");if(id==="animation"&&selectedClipForTools)updateSelectedClip({opacity:selectedClipForTools.opacity===.6?1:.6});if(id==="cover"&&selectedClipForTools)updateSelectedClip({fit:selectedClipForTools.fit==="contain"?"cover":"contain"});}}>{label}</button>)}</>}
              {activeTool==="audio" && <>{[["sounds","Sounds"],["extract","Extract audio"],["voiceover","Voiceover"],["effects","Sound effects"],["fade","Fade"],["volume","Volume"],["mixer","Track mixer"],["beats","Beat markers"]].map(([id,label])=><button key={id} className={activeSubtool===id?"active":""} onClick={()=>{setActiveSubtool(id);if(id==="sounds")setEffectSearch("");else if(id==="extract")setStatus("To extract audio, import the source video and add its audio separately. Direct audio extraction is not connected yet.");else if(id==="voiceover")setStatus("Voiceover recorder ready. Use Start voice recording below; the finished take will be added to the Voice track.");else if(id==="beats")setStatus("Beat analysis ready. Choose Detect beat markers below to analyse an imported audio track.");else setStatus(label+" selected.");}}>{label}</button>)}</>}
              {activeTool==="text" && <><button onClick={()=>addTextLayer("standard")}>＋ Add text</button><button onClick={()=>addTextLayer("title")}>Title preset</button><button onClick={()=>addTextLayer("lower-third")}>Lower third</button><button onClick={()=>addTextLayer("subtitle")}>Subtitle preset</button><button onClick={()=>{setActiveSubtool("captions");if(transcriptionText.trim())addTranscriptionCaptions();else setStatus("Transcribe your audio or video in Settings, then create timed captions.");}}>Auto captions</button>{selectedTextLayer&&<button onClick={duplicateSelectedText}>Duplicate selected</button>}</>}
              {activeTool==="text" && <div className="nexus-context-controls"><section className="nexus-effect-group"><b>Text composition</b><p>Build a reusable multi-layer text layout with editable heading, main copy and supporting line.</p><label>Heading <input value={compositionHeading} onChange={e=>setCompositionHeading(e.target.value)} placeholder="Optional heading"/></label><label>Main text <textarea rows={3} value={compositionBody} onChange={e=>setCompositionBody(e.target.value)} placeholder="Enter the main message…"/></label><label>Supporting line <input value={compositionFooter} onChange={e=>setCompositionFooter(e.target.value)} placeholder="Optional attribution or callout"/></label><label>Duration <input type="range" min="4" max="20" step="1" value={compositionDuration} onChange={e=>setCompositionDuration(Number(e.target.value))}/><small>{compositionDuration} seconds</small></label><button disabled={!compositionBody.trim()} onClick={addTextCompositionLayout}>＋ Create text composition</button><button disabled={!compositionBody.trim()} onClick={addApostleQuotePoster}>✦ Apostle Richman Daniel · Quote Poster</button><small>Creates separate editable text layers at the playhead. Add a photo, shape or background from the media library to finish the design.</small></section><div className="nexus-effect-group"><b>Typography looks</b><div className="nexus-effect-categories"><button disabled={!selectedTextLayer} onClick={()=>updateSelectedText({fontFamily:"Georgia",fontSize:54,color:"#fff7e6",backgroundColor:"#172033",padding:24,align:"center",shadow:true})}>Editorial</button><button disabled={!selectedTextLayer} onClick={()=>updateSelectedText({fontFamily:"Arial",fontSize:48,color:"#f5c76b",backgroundColor:"#111827",padding:28,align:"center",shadow:false})}>Gold accent</button><button disabled={!selectedTextLayer} onClick={()=>updateSelectedText({fontFamily:"Verdana",fontSize:42,color:"#ffffff",backgroundColor:"transparent",padding:0,align:"left",shadow:true})}>Minimal</button></div><small>Select a text layer first. These looks change editable layer properties and are included in the rendered composition.</small></div><label>Text content <textarea rows={3} value={textLayers.find(layer=>layer.id===selectedTextLayer)?.text ?? overlayText} onChange={e=>{setOverlayText(e.target.value);if(selectedTextLayer)updateSelectedText({text:e.target.value});}} placeholder="Type your title, caption or message…"/></label><label>Font family <select value={textLayers.find(layer=>layer.id===selectedTextLayer)?.fontFamily ?? textFont} onChange={e=>{setTextFont(e.target.value);if(selectedTextLayer)updateSelectedText({fontFamily:e.target.value});}}>{["Arial","Georgia","Impact","Verdana","Trebuchet MS","Courier New","Times New Roman","serif","sans-serif","monospace"].map(font=><option key={font}>{font}</option>)}</select></label><label>Font size <input type="range" min="12" max="120" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.fontSize ?? textSize} onChange={e=>{const value=Number(e.target.value);setTextSize(value);if(selectedTextLayer)updateSelectedText({fontSize:value});}}/></label><label>Text colour <input type="color" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.color ?? textColor} onChange={e=>{setTextColor(e.target.value);if(selectedTextLayer)updateSelectedText({color:e.target.value});}}/></label><label>Background <select value={textLayers.find(layer=>layer.id===selectedTextLayer)?.backgroundColor ?? "transparent"} onChange={e=>selectedTextLayer&&updateSelectedText({backgroundColor:e.target.value,padding:e.target.value==="transparent"?0:12})}><option value="transparent">Transparent</option><option value="#111827">Dark panel</option><option value="#000000">Black</option><option value="#ffffff">White</option><option value="#6d28d9">Violet</option><option value="#0e7490">Teal</option></select></label><label>Background padding <input type="range" min="0" max="48" step="2" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.padding ?? 12} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({padding:Number(e.target.value)})}/><small>{textLayers.find(layer=>layer.id===selectedTextLayer)?.padding ?? 12}px</small></label><label><input type="checkbox" checked={textLayers.find(layer=>layer.id===selectedTextLayer)?.shadow ?? true} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({shadow:e.target.checked})}/> Text shadow</label><label>Horizontal position <input type="range" min="0" max="100" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.x ?? 50} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({x:Number(e.target.value)})}/></label><label>Vertical position <input type="range" min="0" max="100" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.y ?? 50} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({y:Number(e.target.value)})}/></label><label>Rotation <input type="range" min="-180" max="180" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.rotation ?? 0} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({rotation:Number(e.target.value)})}/></label><label>Opacity <input type="range" min="0" max="1" step=".05" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.opacity ?? 1} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({opacity:Number(e.target.value)})}/></label><label>Alignment <select value={textLayers.find(layer=>layer.id===selectedTextLayer)?.align ?? "center"} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({align:e.target.value as "left"|"center"|"right"})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label>Animation <select value={textLayers.find(layer=>layer.id===selectedTextLayer)?.animation ?? "none"} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({animation:e.target.value as "none"|"fade"|"pop"})}><option value="none">None</option><option value="fade">Fade</option><option value="pop">Pop</option></select></label>{selectedTextLayer&&<><label>Start time <input type="range" min="0" max={Math.max(duration,1)} step=".1" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.start ?? 0} onChange={e=>updateSelectedText({start:Number(e.target.value)})}/></label><label>Duration <input type="range" min=".5" max="30" step=".5" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.duration ?? 5} onChange={e=>updateSelectedText({duration:Number(e.target.value)})}/></label><button onClick={()=>{recordProjectHistory();setTextLayers(old=>old.filter(layer=>layer.id!==selectedTextLayer));setSelectedTextLayer(null);setStatus("Text layer deleted. Use Undo to restore it.");}}>Delete text layer</button></>}</div>}
              {activeTool==="overlay" && <>{["Add overlay","Mask","Blend","Position","Opacity"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);if(x==="Add overlay")setShowAttachmentPicker(true);else setStatus(x+" controls selected.");}}>{x}</button>)}</>}
              {activeTool==="effects" && <><div className="nexus-effect-group"><b>One-tap effect looks · 25 editable combinations</b><div className="nexus-effect-categories">{CREATIVE_EFFECTS.map(effect=><button key={effect.name} disabled={!selectedClip} className={activeSubtool===effect.name?"active":""} onClick={()=>applyCreativeEffect(effect)}>{effect.name}</button>)}</div><small>Each look combines a filter with editable colour, exposure and vignette settings. Select a clip to apply.</small></div><div className="nexus-effect-group"><span>Explore video effects</span><input aria-label="Search effects" value={effectSearch} onChange={e=>setEffectSearch(e.target.value)} placeholder="Search effects and looks…"/><div className="nexus-effect-categories">{["All","Cinematic","Film","Color","Creative","Portrait","Product"].map(x=><button key={x} className={effectCategory===x?"active":""} onClick={()=>setEffectCategory(x)}>{x}</button>)}</div>{effectItems.filter(x=>(effectCategory==="All"||x.category===effectCategory)&&x.name.toLowerCase().includes(effectSearch.toLowerCase())).map(x=><button key={x.name} className={selectedClip?.filter===x.name?"active":""} disabled={!selectedClip} onClick={()=>{setActiveSubtool(x.name);if(selectedClip)updateSelectedClip({filter:x.name});}}>{x.name}</button>)}</div><div className="nexus-effect-group"><b>Clip transitions</b><p>Set independent entrance and exit timing, then choose the transition style used by preview and export.</p><label>Entrance duration <input type="range" min="0" max="3" step=".05" disabled={!selectedClip} value={selectedClip?.transitionIn ?? 0} onChange={e=>updateSelectedClip({transitionIn:Number(e.target.value)})}/><small>{(selectedClip?.transitionIn ?? 0).toFixed(2)}s</small></label><label>Exit duration <input type="range" min="0" max="3" step=".05" disabled={!selectedClip} value={selectedClip?.transitionOut ?? 0} onChange={e=>updateSelectedClip({transitionOut:Number(e.target.value)})}/><small>{(selectedClip?.transitionOut ?? 0).toFixed(2)}s</small></label><div className="nexus-effect-categories">{[{label:"Fade",value:"fade"},{label:"Zoom",value:"zoom"},{label:"Wipe",value:"wipe"},{label:"Slide",value:"slide"},{label:"Blur",value:"blur"}].map(item=><button key={item.value} disabled={!selectedClip} className={(selectedClip?.transitionStyle||"fade")===item.value?"active":""} onClick={()=>updateSelectedClip({transitionStyle:item.value as "fade"|"zoom"|"wipe"|"slide"|"blur"})}>{item.label}</button>)}</div><div className="nexus-speed-presets"><button disabled={!selectedClip} onClick={()=>updateSelectedClip({transitionIn:.5,transitionOut:.5,transitionStyle:"fade"})}>Soft crossfade</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({transitionIn:.7,transitionOut:0,transitionStyle:"zoom"})}>Zoom entrance</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({transitionIn:0,transitionOut:.7,transitionStyle:"slide"})}>Slide exit</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({transitionIn:0,transitionOut:0})}>Clear transitions</button></div><small>Transitions are applied at the selected clip’s own boundaries. Keep their duration shorter than the clip for a clean result.</small></div><div className="nexus-effect-group"><b>Motion & keyframes</b><p>Animate the selected clip over time. Move the playhead, set a keyframe, change the framing, then set another keyframe.</p><div className="nexus-speed-presets"><button disabled={!selectedClip} onClick={()=>applyMotionPreset("push-in")}>Smooth push-in</button><button disabled={!selectedClip} onClick={()=>applyMotionPreset("pan")}>Pan left to right</button><button disabled={!selectedClip} onClick={()=>applyMotionPreset("fade-zoom")}>Fade + zoom</button></div><div className="nexus-speed-presets"><button disabled={!selectedClip} onClick={addKeyframeAtPlayhead}>＋ Set keyframe here</button><button disabled={!selectedClip || !(selectedClip.keyframes||[]).length} onClick={removeNearestKeyframe}>Remove nearest</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({keyframes:[],zoom:100,rotation:0,offsetX:0,offsetY:0,opacity:1})}>Reset motion</button></div><small>{selectedClip?.keyframes?.length || 0} keyframe(s) · playhead {clock(Math.max(0,playhead-(selectedClip?.start||0)))} · values interpolate smoothly between saved points</small>{!!selectedClip?.keyframes?.length && <div className="nexus-effect-categories">{[...selectedClip.keyframes].sort((a,b)=>a.time-b.time).map((frame,index)=><button key={selectedClip.id+"-kf-"+index} className={Math.abs(playhead-selectedClip.start-frame.time)<0.12?"active":""} onClick={()=>setPlayhead(selectedClip.start+frame.time)}>KF {index+1} · {clock(frame.time)}</button>)}</div>}<small>Keyframes animate scale, rotation, horizontal/vertical position and opacity. They are included in the browser preview and rendered export.</small></div></>}
              {activeTool==="captions" && <><button onClick={()=>{setActiveSubtool("Manual captions");setOverlayText("Type your caption");addTextLayer();}}>Add manual caption</button><button onClick={addTranscriptionCaptions} disabled={!transcriptionText.trim()}>Create timed captions from transcript</button></>}
              {activeTool==="filters" && <><div className="nexus-effect-group"><b>Filter library · {effectItems.length} looks</b><input aria-label="Search filters" value={effectSearch} onChange={e=>setEffectSearch(e.target.value)} placeholder="Search filters…"/><div className="nexus-effect-categories">{["All","Cinematic","Film","Color","Portrait","Product","Creative"].map(category=><button key={category} className={effectCategory===category?"active":""} onClick={()=>setEffectCategory(category)}>{category}</button>)}</div>{effectItems.filter((item,index,list)=>(effectCategory==="All"||item.category===effectCategory)&&item.name.toLowerCase().includes(effectSearch.toLowerCase())&&list.findIndex(other=>other.name===item.name)===index).map(item=><button key={item.name} className={selectedClip?.filter===item.name?"active":""} disabled={!selectedClip} onClick={()=>{setActiveSubtool(item.name);if(selectedClip)updateSelectedClip({filter:item.name});}}>{item.name}</button>)}<small>Filters are non-destructive clip settings and are shared by the browser preview and export renderer.</small></div></>}
              {activeTool==="adjust" && <>{["Brightness","Contrast","Saturation","Exposure","Temperature","HSL"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" adjustment selected.");}}>{x}</button>)}</>}
              {activeTool==="media" && <><button onClick={()=>setShowAttachmentPicker(true)}>＋ Add media</button><button onClick={()=>setEditorView("import")}>Media library</button></>}
              {activeTool==="stickers" && <>{["😀","🔥","⭐","❤️","✨","🎉","▶","●","◆","＋","🌟","💫","⚡","💥","🎮","🎧","🎤","🎬","📸","🎥","🚀","🌈","☀️","🌙","🌊","🌴","🌸","🍀","🎯","🏆","👑","💎","🪩","🎵","🎶","💡","📍","✦","✧","♡","✓","➜","➤","★","✕","☁️","🦋","🪄","💬","🔔"].map(x=><button key={x} onClick={()=>addGraphicLayer(x)}>{x}</button>)}<button onClick={()=>setShowAttachmentPicker(true)}>Import sticker</button></>}
              {activeTool==="background" && <><button onClick={()=>addGraphicLayer(" ", "#ffffff", "#111827")}>Dark panel</button><button onClick={()=>addGraphicLayer(" ", "#ffffff", "#ffffff")}>Light panel</button><button onClick={()=>addGraphicLayer(" ", "#ffffff", "#7c3aed")}>Purple panel</button><button onClick={()=>addGraphicLayer(" ", "#ffffff", "#0e7490")}>Teal panel</button><button onClick={()=>{if(selectedTextLayer)updateSelectedText({backgroundColor:"transparent"});setStatus("Selected graphic background cleared.");}}>Clear selected panel</button></>}
              {activeTool==="ratio" && <>{["9:16","16:9","1:1","4:5","3:4"].map(x=><button key={x} className={aspectRatio===x?"active":""} onClick={()=>setAspectRatio(x)}>{x}</button>)}</>}
            </div>
            {activeTool==="text" && <div className="nexus-context-controls"><input aria-label="Edit text" value={overlayText} onChange={e=>{setOverlayText(e.target.value);updateSelectedText({text:e.target.value});}} placeholder="Type text"/><select aria-label="Font" value={textFont} onChange={e=>{setTextFont(e.target.value);updateSelectedText({fontFamily:e.target.value});}}><option>Arial</option><option>Georgia</option><option>Impact</option><option>Courier New</option></select><label>Size <input type="range" min="12" max="72" value={textSize} onChange={e=>{setTextSize(Number(e.target.value));updateSelectedText({fontSize:Number(e.target.value)});}}/></label><input aria-label="Text colour" type="color" value={textColor} onChange={e=>{setTextColor(e.target.value);updateSelectedText({color:e.target.value});}}/><label>Animation <select value={textLayers.find(l=>l.id===selectedTextLayer)?.animation || "none"} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({animation:e.target.value as "none"|"fade"|"pop"})}><option value="none">None</option><option value="fade">Fade</option><option value="pop">Pop</option></select></label><label>Alignment <select value={textLayers.find(l=>l.id===selectedTextLayer)?.align || "center"} disabled={!selectedTextLayer} onChange={e=>updateSelectedText({align:e.target.value as "left"|"center"|"right"})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label>Text blend <select disabled={!selectedTextLayer} value={textLayers.find(l=>l.id===selectedTextLayer)?.blendMode||"normal"} onChange={e=>updateSelectedText({blendMode:e.target.value as TimelineTextLayer["blendMode"]})}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="soft-light">Soft light</option><option value="hard-light">Hard light</option></select></label><button onClick={()=>addTextLayer()}><Plus size={14}/> Add timed text</button>{selectedTextLayer && <><label>Opacity <input type="range" min="0" max="1" step=".05" value={textLayers.find(l=>l.id===selectedTextLayer)?.opacity ?? 1} onChange={e=>updateSelectedText({opacity:Number(e.target.value)})}/></label><label>Rotation <input type="range" min="-180" max="180" value={textLayers.find(l=>l.id===selectedTextLayer)?.rotation ?? 0} onChange={e=>updateSelectedText({rotation:Number(e.target.value)})}/></label><label>Background <input type="color" value={textLayers.find(l=>l.id===selectedTextLayer)?.backgroundColor==="transparent"?"#000000":textLayers.find(l=>l.id===selectedTextLayer)?.backgroundColor || "#000000"} onChange={e=>updateSelectedText({backgroundColor:e.target.value})}/></label><label>Horizontal position <input type="range" min="0" max="100" value={textLayers.find(l=>l.id===selectedTextLayer)?.x ?? 50} onChange={e=>updateSelectedText({x:Number(e.target.value)})}/></label><label>Vertical position <input type="range" min="0" max="100" value={textLayers.find(l=>l.id===selectedTextLayer)?.y ?? 50} onChange={e=>updateSelectedText({y:Number(e.target.value)})}/></label></>}{selectedTextLayer&&<><label>Start time <input type="number" min="0" max="600" step=".1" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.start??0} onChange={e=>updateSelectedText({start:Math.max(0,Math.min(600,Number(e.target.value)||0))})}/></label><label>Duration <input type="number" min=".1" max="600" step=".1" value={textLayers.find(layer=>layer.id===selectedTextLayer)?.duration||5} onChange={e=>updateSelectedText({duration:Math.max(.1,Math.min(600,Number(e.target.value)||.1))})}/></label><div className="nexus-effect-categories"><button onClick={()=>reorderSelectedText(-1)}>Send backward</button><button onClick={()=>reorderSelectedText(1)}>Bring forward</button><button onClick={toggleSelectedTextVisibility}>{textLayers.find(layer=>layer.id===selectedTextLayer)?.visible===false?"Show layer":"Hide layer"}</button><button onClick={duplicateSelectedTextLayer}>Duplicate</button><button onClick={()=>{recordProjectHistory();setTextLayers(old=>old.filter(layer=>layer.id!==selectedTextLayer));setSelectedTextLayer(null);setStatus("Text layer deleted. Use Undo to restore it.");}}>Delete layer</button></div></>}</div>}
            {activeTool==="overlay" && <div className="nexus-context-controls"><div className="nexus-effect-group"><b>Layer compositing</b><p>Blend the selected visual clip with the layers underneath it in the exported composition.</p><label>Blend mode <select disabled={!selectedClip} value={selectedClip?.blendMode || "normal"} onChange={e=>updateSelectedClip({blendMode:e.target.value as "normal"|"multiply"|"screen"|"overlay"|"darken"|"lighten"|"soft-light"|"hard-light"})}><option value="normal">Normal</option><option value="multiply">Multiply · darken</option><option value="screen">Screen · lighten</option><option value="overlay">Overlay · contrast</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="soft-light">Soft light</option><option value="hard-light">Hard light</option></select></label><label>Mask shape <select disabled={!selectedClip} value={selectedClip?.maskShape || "none"} onChange={e=>updateSelectedClip({maskShape:e.target.value as "none"|"circle"|"rounded"|"horizontal"|"vertical"})}><option value="none">No mask</option><option value="circle">Circle</option><option value="rounded">Rounded rectangle</option><option value="horizontal">Horizontal band</option><option value="vertical">Vertical band</option><option value="diamond">Diamond</option><option value="hexagon">Hexagon</option><option value="star">Star</option></select></label>{selectedClip?.maskShape==="rounded" && <label>Corner roundness <input type="range" min="0" max="50" value={selectedClip?.maskRadius ?? 12} onChange={e=>updateSelectedClip({maskRadius:Number(e.target.value)})}/><small>{selectedClip?.maskRadius ?? 12}% radius</small></label>}<div className="nexus-effect-group"><b>Transform tools</b><div className="nexus-effect-categories"><button disabled={!selectedClip} className={selectedClip?.flipHorizontal?"active":""} onClick={()=>updateSelectedClip({flipHorizontal:!selectedClip?.flipHorizontal})}>Flip horizontal</button><button disabled={!selectedClip} className={selectedClip?.flipVertical?"active":""} onClick={()=>updateSelectedClip({flipVertical:!selectedClip?.flipVertical})}>Flip vertical</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({rotation:(selectedClip?.rotation??0)-90})}>Rotate −90°</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({rotation:(selectedClip?.rotation??0)+90})}>Rotate +90°</button></div><small>Mirroring and rotation are applied in preview and export.</small></div><label>Layer opacity <input type="range" min="0" max="1" step=".05" disabled={!selectedClip} value={selectedClip?.opacity ?? 1} onChange={e=>updateSelectedClip({opacity:Number(e.target.value)})}/><small>{Math.round((selectedClip?.opacity ?? 1)*100)}%</small></label><label>Layer scale <input type="range" min="25" max="250" disabled={!selectedClip} value={selectedClip?.zoom ?? 100} onChange={e=>updateSelectedClip({zoom:Number(e.target.value)})}/></label><label>Horizontal position <input type="range" min="-50" max="50" disabled={!selectedClip} value={selectedClip?.offsetX ?? 0} onChange={e=>updateSelectedClip({offsetX:Number(e.target.value)})}/></label><label>Vertical position <input type="range" min="-50" max="50" disabled={!selectedClip} value={selectedClip?.offsetY ?? 0} onChange={e=>updateSelectedClip({offsetY:Number(e.target.value)})}/></label><label>Rotation <input type="range" min="-180" max="180" disabled={!selectedClip} value={selectedClip?.rotation ?? 0} onChange={e=>updateSelectedClip({rotation:Number(e.target.value)})}/></label><button disabled={!selectedClip} onClick={()=>updateSelectedClip({blendMode:"normal",maskShape:"none",opacity:1,zoom:100,offsetX:0,offsetY:0,rotation:0})}>Reset layer</button><small>Blend modes are applied by the export compositor. The single-clip preview does not yet show the full multi-layer blend result.</small></div></div>}
{activeTool==="adjust" && <div className="nexus-context-controls"><div className="nexus-effect-group"><b>Professional colour grading</b><label>Exposure <input type="range" min="-2" max="2" step=".05" value={selectedClip?.exposure ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({exposure:Number(e.target.value)})}/><small>{(selectedClip?.exposure ?? 0).toFixed(2)} EV</small></label><label>Temperature <input type="range" min="-100" max="100" value={selectedClip?.temperature ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({temperature:Number(e.target.value)})}/><small>{(selectedClip?.temperature ?? 0)<0?"Cooler":(selectedClip?.temperature ?? 0)>0?"Warmer":"Neutral"}</small></label><label>Tint <input type="range" min="-100" max="100" value={selectedClip?.tint ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({tint:Number(e.target.value)})}/><small>{(selectedClip?.tint ?? 0)<0?"Green shift":(selectedClip?.tint ?? 0)>0?"Magenta shift":"Neutral"}</small></label><label>Highlights <input type="range" min="-100" max="100" value={selectedClip?.highlights ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({highlights:Number(e.target.value)})}/></label><label>Shadows <input type="range" min="-100" max="100" value={selectedClip?.shadows ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({shadows:Number(e.target.value)})}/></label><label>Vignette <input type="range" min="0" max="100" value={selectedClip?.vignette ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({vignette:Number(e.target.value)})}/><small>{selectedClip?.vignette ?? 0}% edge darkening</small></label><div className="nexus-speed-presets"><button disabled={!selectedClip} onClick={()=>updateSelectedClip({exposure:0,temperature:0,tint:0,highlights:0,shadows:0,vignette:0})}>Neutral</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({exposure:.25,temperature:28,tint:5,highlights:-15,shadows:18,vignette:18})}>Warm cinematic</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({exposure:.15,temperature:-28,tint:-5,highlights:-10,shadows:12,vignette:8})}>Cool clean</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({exposure:-.25,temperature:8,tint:8,highlights:-30,shadows:-12,vignette:42})}>Moody</button></div><small>Colour adjustments are applied to the live preview and browser export. Highlights and shadows use a lightweight tonal approximation, not a full colour-curve editor.</small></div><label>Brightness <input type="range" min="0" max="200" value={selectedClip?.brightness ?? 100} disabled={!selectedClip} onChange={e=>updateSelectedClip({brightness:Number(e.target.value)})}/></label><label>Contrast <input type="range" min="0" max="200" value={selectedClip?.contrast ?? 100} disabled={!selectedClip} onChange={e=>updateSelectedClip({contrast:Number(e.target.value)})}/></label><label>Saturation <input type="range" min="0" max="200" value={selectedClip?.saturation ?? 100} disabled={!selectedClip} onChange={e=>updateSelectedClip({saturation:Number(e.target.value)})}/></label><label>Rotate <input type="range" min="-180" max="180" value={selectedClip?.rotation ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({rotation:Number(e.target.value)})}/></label><label>Scale <input type="range" min="50" max="200" value={selectedClip?.zoom ?? 100} disabled={!selectedClip} onChange={e=>updateSelectedClip({zoom:Number(e.target.value)})}/></label><label>Horizontal <input type="range" min="-50" max="50" value={selectedClip?.offsetX ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({offsetX:Number(e.target.value)})}/></label><label>Vertical <input type="range" min="-50" max="50" value={selectedClip?.offsetY ?? 0} disabled={!selectedClip} onChange={e=>updateSelectedClip({offsetY:Number(e.target.value)})}/></label><section className="nexus-effect-group"><b>Image finishing presets</b><small>Non-destructive clip settings. These apply to the selected still image and are reflected in preview and export.</small><div className="nexus-speed-presets"><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("food"))}>Food fresh</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("landscape"))}>Landscape pop</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("night"))}>Night mood</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("pastel"))}>Pastel</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("dramatic"))}>Dramatic</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("warm-film"))}>Warm film</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("clean-studio"))}>Clean studio</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("cool-editorial"))}>Cool editorial</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("soft-glow"))}>Soft glow</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("portrait"))}>Portrait soft</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("product"))}>Product pop</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("editorial"))}>Editorial</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("mono"))}>Monochrome</button><button disabled={!selectedClip || asset?.kind!=="image"} onClick={()=>updateSelectedClip(getImageStylePreset("reset"))}>Reset image look</button></div></section><section className="nexus-effect-group"><b>Video transitions</b><small>Set transition timing on the selected clip. Preview and export share the same transition settings.</small><label>Transition style <select disabled={!selectedClip || asset?.kind!=="video"} value={selectedClip?.transitionStyle||"fade"} onChange={e=>updateSelectedClip({transitionStyle:e.target.value as TimelineClip["transitionStyle"]})}><option value="fade">Fade</option><option value="zoom">Zoom</option><option value="wipe">Wipe</option><option value="slide">Slide</option><option value="blur">Blur</option></select></label><label>Fade / transition in <input type="range" min="0" max="3" step=".1" disabled={!selectedClip || asset?.kind!=="video"} value={selectedClip?.transitionIn??0} onChange={e=>updateSelectedClip({transitionIn:Number(e.target.value)})}/><small>{(selectedClip?.transitionIn??0).toFixed(1)}s</small></label><label>Fade / transition out <input type="range" min="0" max="3" step=".1" disabled={!selectedClip || asset?.kind!=="video"} value={selectedClip?.transitionOut??0} onChange={e=>updateSelectedClip({transitionOut:Number(e.target.value)})}/><small>{(selectedClip?.transitionOut??0).toFixed(1)}s</small></label></section><section className="nexus-effect-group"><b>Chroma key · Green screen</b><small>Removes the selected colour during export. Put your background on a lower video track.</small><label><input type="checkbox" checked={!!selectedClip?.chromaKeyEnabled} onChange={e=>updateSelectedClip({chromaKeyEnabled:e.target.checked})}/> Enable chroma key</label><label>Key colour <input type="color" value={selectedClip?.chromaKeyColor||"#00ff00"} onChange={e=>updateSelectedClip({chromaKeyColor:e.target.value})}/></label><label>Colour tolerance <input type="range" min="8" max="180" value={selectedClip?.chromaKeyTolerance??70} onChange={e=>updateSelectedClip({chromaKeyTolerance:Number(e.target.value)})}/><small>{selectedClip?.chromaKeyTolerance??70}/180</small></label><label>Edge softness <input type="range" min="0" max="100" value={selectedClip?.chromaKeySoftness??28} onChange={e=>updateSelectedClip({chromaKeySoftness:Number(e.target.value)})}/></label><label>Spill suppression <input type="range" min="0" max="100" value={selectedClip?.chromaKeySpill??45} onChange={e=>updateSelectedClip({chromaKeySpill:Number(e.target.value)})}/></label></section><section className="nexus-effect-group"><b>Subject-aware tools</b><small>Scans eight video frames using browser face detection. Results are editable motion keyframes.</small><button onClick={()=>void runSubjectAssist("reframe")}>Auto-reframe subject</button><button onClick={()=>void runSubjectAssist("track")}>Track subject motion</button><small>Face Detection support varies by browser. If unavailable, use the existing manual keyframe controls.</small></section><label>Clip opacity <input type="range" min="0" max="1" step=".05" value={selectedClip?.opacity ?? 1} disabled={!selectedClip} onChange={e=>updateSelectedClip({opacity:Number(e.target.value)})}/></label><label>Crop / fit <select disabled={!selectedClip} value={selectedClip?.fit || "cover"} onChange={e=>updateSelectedClip({fit:e.target.value as "cover"|"contain"})}><option value="cover">Fill frame (crop)</option><option value="contain">Fit entire image</option></select></label><div className="nexus-effect-group"><b>Quick framing</b><div className="nexus-effect-categories"><button disabled={!selectedClip} onClick={()=>{updateSelectedClip({fit:"cover",zoom:100,offsetX:0,offsetY:0});setStatus("Frame reset to centred fill.");}}>Centre fill</button><button disabled={!selectedClip} onClick={()=>{updateSelectedClip({fit:"cover",zoom:125,offsetX:0,offsetY:0});setStatus("Applied close-up framing.");}}>Close-up</button><button disabled={!selectedClip} onClick={()=>{updateSelectedClip({fit:"cover",zoom:115,offsetX:-18,offsetY:0});setStatus("Subject framing shifted left.");}}>Focus left</button><button disabled={!selectedClip} onClick={()=>{updateSelectedClip({fit:"cover",zoom:115,offsetX:18,offsetY:0});setStatus("Subject framing shifted right.");}}>Focus right</button><button disabled={!selectedClip} onClick={()=>{updateSelectedClip({fit:"cover",zoom:115,offsetX:0,offsetY:-18});setStatus("Subject framing shifted upward.");}}>Focus top</button><button disabled={!selectedClip} onClick={()=>{updateSelectedClip({fit:"cover",zoom:115,offsetX:0,offsetY:18});setStatus("Subject framing shifted downward.");}}>Focus bottom</button></div><small>Presets adjust fill, scale and position. Fine-tune with the scale and position sliders; the same transform is used by preview and export.</small></div><button disabled={!selectedClip} onClick={()=>updateSelectedClip({brightness:100,contrast:100,saturation:100,exposure:0,temperature:0,tint:0,highlights:0,shadows:0,vignette:0,rotation:0,zoom:100,offsetX:0,offsetY:0,flipHorizontal:false,flipVertical:false,filter:"Original"})}>Reset adjustments</button><div className="nexus-effect-group"><span>Animation · Keyframes ({selectedClip?.keyframes?.length || 0})</span><button disabled={!selectedClip} onClick={()=>{if(!selectedClip)return;const time=Math.max(0,Math.min(clipDuration(selectedClip),(playhead-selectedClip?.start)));const frame: ClipKeyframe={time,zoom:selectedClip?.zoom??100,rotation:selectedClip?.rotation??0,offsetX:selectedClip?.offsetX??0,offsetY:selectedClip?.offsetY??0,opacity:selectedClip?.opacity??1,easing:"ease-in-out"};const keyframes=[...(selectedClip?.keyframes||[])];const at=keyframes.findIndex(item=>Math.abs(item.time-time)<.04);if(at>=0)keyframes[at]=frame;else keyframes.push(frame);keyframes.sort((a,b)=>a.time-b.time);updateSelectedClip({keyframes});setStatus("Keyframe saved at "+time.toFixed(2)+"s.");}}>◇ Add keyframe at playhead</button><button disabled={!selectedClip?.keyframes?.length} onClick={()=>{if(!selectedClip)return;const time=Math.max(0,playhead-selectedClip?.start);const keyframes=[...(selectedClip?.keyframes||[])];let nearest=0;for(let i=1;i<keyframes.length;i++)if(Math.abs(keyframes[i].time-time)<Math.abs(keyframes[nearest].time-time))nearest=i;keyframes.splice(nearest,1);updateSelectedClip({keyframes});setStatus("Nearest keyframe removed.");}}>Remove nearest keyframe</button><div className="nexus-speed-presets"><button disabled={!selectedClip} onClick={()=>applyMotionPreset("push-in")}>Slow push-in</button><button disabled={!selectedClip} onClick={()=>applyMotionPreset("pan")}>Smooth pan</button><button disabled={!selectedClip} onClick={()=>applyMotionPreset("fade-zoom")}>Fade + zoom</button><button disabled={!selectedClip} onClick={()=>updateSelectedClip({keyframes:[]})}>Clear motion</button></div><div className="nexus-effect-categories">{[{label:"Linear",value:"linear"},{label:"Ease in",value:"ease-in"},{label:"Ease out",value:"ease-out"},{label:"Ease in/out",value:"ease-in-out"}].map(item=><button key={item.value} disabled={!selectedClip?.keyframes?.length} onClick={()=>{if(!selectedClip?.keyframes?.length)return;const keyframes=[...selectedClip?.keyframes];const time=Math.max(0,playhead-selectedClip?.start);let nearest=0;for(let i=1;i<keyframes.length;i++)if(Math.abs(keyframes[i].time-time)<Math.abs(keyframes[nearest].time-time))nearest=i;keyframes[nearest]={...keyframes[nearest],easing:item.value as ClipKeyframe["easing"]};updateSelectedClip({keyframes});setStatus(item.label+" interpolation set on nearest keyframe.");}}>{item.label}</button>)}</div><small>Move the playhead, adjust position / scale / rotation / opacity, then add keyframes. Each keyframe controls the easing into the next point. Motion presets create editable start and end keyframes.</small></div></div>}
            {activeTool==="audio" && <div className="nexus-context-controls">
{(activeSubtool==="sounds"||activeSubtool==="effects"||!activeSubtool) && <>
<section className="nexus-effect-group"><b>Original NEXUS audio lab</b><p>Generate royalty-free sound effects and short music beds directly on this device. These are procedural sounds created inside the editor, not copies of commercial tracks.</p><input aria-label="Search generated audio" value={audioPresetSearch} onChange={e=>setAudioPresetSearch(e.target.value)} placeholder="Search whoosh, chime, drum, ambient…"/><div className="nexus-effect-categories">{["All","Transitions","Cinematic","UI","Nature","African Percussion","Percussion","Music beds"].map(category=><button key={category} className={audioPresetCategory===category?"active":""} onClick={()=>setAudioPresetCategory(category)}>{category}</button>)}</div><div className="nexus-audio-generated-grid">{NEXUS_AUDIO_PRESETS.filter(preset=>(audioPresetCategory==="All"||preset.category===audioPresetCategory)&&preset.name.toLowerCase().includes(audioPresetSearch.toLowerCase())).map(preset=><article className="nexus-audio-generated-item" key={preset.name}><div><b>{preset.name}</b><small>{preset.kind==="music"?"Original music bed":"Sound effect"} · {preset.duration.toFixed(1)}s · {preset.category}</small></div><div className="nexus-speed-presets"><button disabled={!!audioGenerating} onClick={()=>void previewGeneratedAudio(preset)}>{audioGenerating==="preview:"+preset.name?"Preparing…":"Preview"}</button><button disabled={!!audioGenerating} onClick={()=>void addGeneratedAudio(preset)}>{audioGenerating===preset.name?"Generating…":"＋ Add"}</button></div></article>)}</div><small>Generated audio is saved as WAV in the project and placed on an audio timeline track. Music beds are short original loops; duplicate or extend them for longer edits.</small></section>
<AudioAssetBrowser onImport={()=>{setShowAttachmentPicker(true);setStatus("Choose a downloaded or personally licensed audio file to add it to your timeline.");}} onAddAudio={addDownloadedAudio}/>
</>}

{activeSubtool==="extract" && <section className="nexus-effect-group"><b>Extract audio from video</b><p>Choose a video clip on the timeline. Nexus records only its audio track for the selected source in/out range, then places the extracted audio beneath the original clip.</p><button disabled={extractingAudio || !selectedClip || asset?.kind!=="video"} onClick={()=>void extractSelectedVideoAudio()}>{extractingAudio?"Extracting audio…":"Extract selected video audio"}</button><small>Web builds use browser media capture. The Android APK uses its native MediaExtractor path when the selected file URI is available, with browser fallback where supported.</small></section>}
{activeSubtool==="voiceover" && <div className="nexus-context-controls"><p>Record narration directly into the project. Your browser will ask for microphone permission; the recording is placed on the Voice track automatically.</p><section className="nexus-effect-group"><b>{voiceRecording ? "Recording in progress" : "Voiceover recorder"}</b><strong>{clock(voiceRecordingSeconds)}</strong>{voiceRecording ? <button className="active" onClick={stopVoiceoverRecording}>Stop recording and add to timeline</button> : <button onClick={()=>void startVoiceoverRecording()}>Start voice recording</button>}<small>Uses your device microphone with browser echo cancellation, noise suppression and automatic gain control where supported.</small></section></div>}
{activeSubtool==="mixer" && <div className="nexus-context-controls"><p>Balance the four audio buses. Bus volume, mute and solo affect the selected clip preview and the complete export mix; stereo pan is applied during export.</p><div className="nexus-effect-group"><b>Master output</b><label>Final output level <input type="range" min="0" max="1" step=".01" value={masterOutputGain} onChange={e=>setMasterOutputGain(Number(e.target.value))}/><small>{Math.round(masterOutputGain*100)}% · applies after the master limiter during export</small></label></div><div className="nexus-effect-group"><b>Mix starting points</b><div className="nexus-effect-categories"><button onClick={()=>setTrackMix({"audio-1":{volume:1,pan:0,solo:false,muted:false},"audio-2":{volume:.38,pan:0,solo:false,muted:false},"audio-3":{volume:.72,pan:0,solo:false,muted:false},"audio-4":{volume:1.25,pan:0,solo:false,muted:false}})}>Voice forward</button><button onClick={()=>setTrackMix({"audio-1":{volume:1,pan:0,solo:false,muted:false},"audio-2":{volume:.85,pan:0,solo:false,muted:false},"audio-3":{volume:.8,pan:0,solo:false,muted:false},"audio-4":{volume:1,pan:0,solo:false,muted:false}})}>Balanced</button><button onClick={()=>setTrackMix({"audio-1":{volume:1,pan:0,solo:false,muted:false},"audio-2":{volume:.95,pan:0,solo:false,muted:false},"audio-3":{volume:1.2,pan:0,solo:false,muted:false},"audio-4":{volume:1.1,pan:0,solo:false,muted:false}})}>Cinematic</button><button onClick={()=>setTrackMix({})}>Reset all buses</button></div></div>{defaultTracks.filter(track=>track.kind==="audio").map(track=>{const mix=trackMix[track.id]||{volume:1,pan:0,solo:false,muted:false};return <section key={track.id} className="nexus-effect-group"><b>{track.name}</b><label>Volume <input type="range" min="0" max="2" step=".05" value={mix.volume} onChange={e=>setTrackMix(old=>({...old,[track.id]:{...mix,volume:Number(e.target.value)}}))}/><small>{Math.round(mix.volume*100)}%</small></label><label>Stereo pan <input type="range" min="-1" max="1" step=".05" value={mix.pan} onChange={e=>setTrackMix(old=>({...old,[track.id]:{...mix,pan:Number(e.target.value)}}))}/><small>{mix.pan<-.05?"Left":mix.pan>.05?"Right":"Centre"}</small></label><button className={mix.solo?"active":""} onClick={()=>setTrackMix(old=>({...old,[track.id]:{...mix,solo:!mix.solo}}))}>{mix.solo?"Unsolo":"Solo"}</button><button className={mix.muted?"active":""} onClick={()=>setTrackMix(old=>({...old,[track.id]:{...mix,muted:!mix.muted}}))}>{mix.muted?"Unmute track":"Mute track"}</button><button onClick={()=>setTrackMix(old=>({...old,[track.id]:{volume:1,pan:0,solo:false,muted:false}}))}>Reset bus</button></section>;})}</div>}{activeSubtool==="beats" && <div className="nexus-context-controls"><p>Analyse an imported music or audio track locally. Markers are estimated from energy/transient peaks, so use them as editing guides rather than guaranteed musical downbeats.</p><button disabled={beatAnalysisBusy || !assets.some(item=>item.kind==="audio")} onClick={()=>void detectSelectedAudioBeats()}>{beatAnalysisBusy?"Analysing audio…":"Detect beat markers"}</button><button disabled={!beatMarkers.length} onClick={clearBeatMarkers}>Clear markers</button><div className="nexus-effect-group"><span>{beatMarkers.length} detected markers</span>{beatMarkers.map((marker,index)=><button key={marker.assetId+"-"+marker.time+"-"+index} onClick={()=>{const clip=clips.find(item=>item.assetId===marker.assetId);setPlayhead((clip?.start||0)+marker.time);if(clip)setSelected(clip.id);setStatus("Playhead moved to estimated beat at "+marker.time.toFixed(2)+"s.");}}>{clock(marker.time)} · {marker.time.toFixed(2)}s</button>)}</div></div>}
{selectedClip && <><label>Audio track <select value={selectedClip.trackId} onChange={e=>updateSelectedClip({trackId:e.target.value})}>{defaultTracks.filter(track=>track.kind==="audio").map(track=><option key={track.id} value={track.id}>{track.name}</option>)}</select></label><label>Clip volume <input type="range" min="0" max="2" step="0.05" value={selectedClip.gain??1} onChange={e=>updateSelectedClip({gain:Number(e.target.value)})}/><small>{Math.round((selectedClip.gain??1)*100)}% gain</small></label><label>Clip stereo position <input type="range" min="-1" max="1" step="0.05" value={selectedClip.pan??0} onChange={e=>updateSelectedClip({pan:Number(e.target.value)})}/><small>{(selectedClip.pan??0)<-.05?"Left":(selectedClip.pan??0)>.05?"Right":"Centre"} · clip pan combines with the track bus</small></label><label>Low-cut filter <input type="range" min="20" max="1200" step="10" value={selectedClip.highPassHz??20} onChange={e=>updateSelectedClip({highPassHz:Number(e.target.value)})}/><small>{selectedClip.highPassHz??20} Hz · reduce rumble and handling noise</small></label><label>High-cut filter <input type="range" min="1500" max="20000" step="100" value={selectedClip.lowPassHz??20000} onChange={e=>updateSelectedClip({lowPassHz:Number(e.target.value)})}/><small>{(selectedClip.lowPassHz??20000)>=20000?"Open / neutral":(selectedClip.lowPassHz??20000)+" Hz · soften high frequencies"}</small></label><label>Voice / audio compression <input type="range" min="0" max="100" step="5" value={selectedClip.compression??0} onChange={e=>updateSelectedClip({compression:Number(e.target.value)})}/><small>{selectedClip.compression??0}% · even out loud and quiet sections during export</small></label><div className="nexus-effect-group"><b>Vocal processing presets</b><button onClick={()=>updateSelectedClip({highPassHz:80,lowPassHz:16000,compression:45})}>Clean voice</button><button onClick={()=>updateSelectedClip({highPassHz:60,lowPassHz:12000,compression:30})}>Warm voice</button><button onClick={()=>updateSelectedClip({highPassHz:250,lowPassHz:4000,compression:65})}>Radio voice</button><small>These presets use EQ and dynamics processing during export. They are not AI vocal isolation and cannot fully remove background speech or music.</small></div><label>Noise gate <input type="range" min="0" max="100" step="5" value={selectedClip.noiseGate??0} onChange={e=>updateSelectedClip({noiseGate:Number(e.target.value)})}/><small>{selectedClip.noiseGate??0}% · reduces quiet background noise between phrases</small></label><div className="nexus-speed-presets"><button onClick={()=>updateSelectedClip({highPassHz:90,lowPassHz:16000,compression:45,noiseGate:25})}>Voice cleanup</button><button onClick={()=>updateSelectedClip({highPassHz:70,lowPassHz:18000,compression:30,noiseGate:10})}>Podcast cleanup</button><button onClick={()=>updateSelectedClip({highPassHz:20,lowPassHz:20000,compression:0,noiseGate:0})}>Original audio</button></div><small>Noise gate is applied during export. It reduces quieter background sound but is not AI vocal isolation and may also cut off very quiet speech.</small><button onClick={()=>updateSelectedClip({highPassHz:20,lowPassHz:20000,compression:0,noiseGate:0})}>Reset audio processing</button><label>Trim start <input type="range" min="0" max={Math.max(0,(assets.find(item=>item.id===selectedClip.assetId)?.duration||selectedClip.sourceOut)-0.1)} step="0.05" value={selectedClip.sourceIn} onChange={e=>{const value=Number(e.target.value);if(value<selectedClip.sourceOut-0.1)updateSelectedClip({sourceIn:value});}}/></label><label>Trim end <input type="range" min={selectedClip.sourceIn+0.1} max={assets.find(item=>item.id===selectedClip.assetId)?.duration||selectedClip.sourceOut} step="0.05" value={selectedClip.sourceOut} onChange={e=>updateSelectedClip({sourceOut:Number(e.target.value)})}/></label><label>Fade in <input type="range" min="0" max={Math.min(10,(selectedClip.sourceOut-selectedClip.sourceIn)/2)} step="0.1" value={selectedClip.fadeIn||0} onChange={e=>updateSelectedClip({fadeIn:Number(e.target.value)})}/></label><div className="nexus-speed-presets"><button onClick={()=>updateSelectedClip({fadeIn:1.2,fadeOut:1.2})}>Smooth fades</button><button onClick={()=>updateSelectedClip({fadeIn:0.25,fadeOut:0.25})}>Quick fades</button><button onClick={()=>updateSelectedClip({fadeIn:0,fadeOut:0})}>Clear fades</button></div><label>Fade out <input type="range" min="0" max={Math.min(10,(selectedClip.sourceOut-selectedClip.sourceIn)/2)} step="0.1" value={selectedClip.fadeOut||0} onChange={e=>updateSelectedClip({fadeOut:Number(e.target.value)})}/></label><button className={selectedClip.muted?"active":""} onClick={()=>updateSelectedClip({muted:!selectedClip.muted})}>{selectedClip.muted?"Unmute audio":"Mute audio"}</button><small>Multiple audio tracks can play together. Track placement, trim, gain and fades are included in the export mix.</small></>}
</div>}{activeTool==="edit" && selectedClip && <div className="nexus-context-controls"><button onClick={split}><Scissors size={15}/> Split at playhead</button><button onClick={()=>{const copy={...selectedClip,id:uid(),start:selectedClip.start+clipDuration(selectedClip),label:selectedClip.label+" copy"};applyClipChange([...clips,copy],"Selected clip duplicated after the original.");setSelected(copy.id);setPlayhead(copy.start);}}>Duplicate clip</button><button className={muteClip?"active":""} onClick={()=>{setMuteClip(v=>!v);updateSelectedClip({muted:!muteClip});}}><Volume2 size={15}/> {muteClip?"Unmute":"Mute clip"}</button><button onClick={trimSelectedAtPlayhead}>Trim end here</button><button onClick={()=>nudgeSelectedClip(-1)}>← 1s</button><button onClick={()=>nudgeSelectedClip(1)}>1s →</button><div className="nexus-speed-controls"><label>Playback speed <input type="range" min=".25" max="4" step=".05" value={selectedClip.speed ?? 1} onChange={e=>{const value=Number(e.target.value);updateSelectedClip({speed:value,speedCurve:[]});setStatus(`Clip speed set to ${value.toFixed(2)}×`);}}/></label><div className="nexus-speed-presets">{[{label:"0.25×",value:.25},{label:"0.5×",value:.5},{label:"0.75×",value:.75},{label:"1×",value:1},{label:"1.5×",value:1.5},{label:"2×",value:2},{label:"3×",value:3},{label:"4×",value:4}].map(p=><button key={p.value} className={(selectedClip.speed??1)===p.value?"active":""} onClick={()=>{updateSelectedClip({speed:p.value,speedCurve:[]});setStatus(`Clip speed set to ${p.label}`);}}>{p.label}</button>)}</div><section className="nexus-effect-group"><b>Speed ramp curve</b><small>Gradually change speed across the clip. The curve is applied to preview and export.</small><div className="nexus-speed-presets"><button className={selectedClip.speedCurve?.[1]?.speed===2?"active":""} onClick={()=>{updateSelectedClip({speed:1,speedCurve:[{position:0,speed:.5},{position:.5,speed:1},{position:1,speed:2}]});setStatus("Smooth speed ramp applied.");}}>Slow → fast</button><button onClick={()=>{updateSelectedClip({speed:1,speedCurve:[{position:0,speed:2},{position:.5,speed:.5},{position:1,speed:2}]});setStatus("Speed pulse applied.");}}>Speed pulse</button><button onClick={()=>{updateSelectedClip({speed:1,speedCurve:[{position:0,speed:.5},{position:1,speed:.5}]});setStatus("Slow motion curve applied.");}}>Slow motion</button><button onClick={()=>{updateSelectedClip({speed:1,speedCurve:[]});setStatus("Speed ramp cleared.");}}>Clear curve</button></div><label>Start speed <input type="range" min=".25" max="4" step=".05" value={selectedClip.speedCurve?.[0]?.speed??selectedClip.speed??1} onChange={e=>{const value=Number(e.target.value);const old=selectedClip.speedCurve||[{position:0,speed:selectedClip.speed??1},{position:1,speed:selectedClip.speed??1}];updateSelectedClip({speed:1,speedCurve:[{position:0,speed:value},...old.slice(1,-1),{position:1,speed:old[old.length-1]?.speed??1}]});}}/></label><label>End speed <input type="range" min=".25" max="4" step=".05" value={selectedClip.speedCurve?.[selectedClip.speedCurve.length-1]?.speed??selectedClip.speed??1} onChange={e=>{const value=Number(e.target.value);const old=selectedClip.speedCurve||[{position:0,speed:selectedClip.speed??1},{position:1,speed:selectedClip.speed??1}];updateSelectedClip({speed:1,speedCurve:[{position:0,speed:old[0]?.speed??1},...old.slice(1,-1),{position:1,speed:value}]});}}/></label><small>{selectedClip.speedCurve?.length?"Custom ramp active":"Fixed speed active"} · timeline duration {clock(clipDuration(selectedClip))}</small></section><small>Timeline duration at this speed: {clock((selectedClip.sourceOut-selectedClip.sourceIn)/Math.max(.1,selectedClip.speed??1))} · Original source: {clock(selectedClip.sourceOut-selectedClip.sourceIn)}</small><button onClick={()=>{updateSelectedClip({speed:1,speedCurve:[]});setStatus("Clip speed reset to normal.");}}>Reset to 1×</button></div><label>Clip opacity <input type="range" min="0" max="1" step=".05" value={selectedClip.opacity ?? 1} onChange={e=>updateSelectedClip({opacity:Number(e.target.value)})}/></label><label>Fit <select value={selectedClip.fit || "cover"} onChange={e=>updateSelectedClip({fit:e.target.value as "cover"|"contain"})}><option value="cover">Fill / crop</option><option value="contain">Fit inside</option></select></label><label>Gain <input type="range" min="0" max="1" step=".05" value={clipGain} onChange={e=>{const value=Number(e.target.value);setClipGain(value);updateSelectedClip({gain:value});if(video.current)applyMediaElementGain(video.current,value);if(audioPreview.current)applyMediaElementGain(audioPreview.current,value);}}/></label><label>Fade in <input type="range" min="0" max="5" step=".1" value={selectedClip.fadeIn||0} onChange={e=>updateSelectedClip({fadeIn:Number(e.target.value)})}/></label><label>Fade out <input type="range" min="0" max="5" step=".1" value={selectedClip.fadeOut||0} onChange={e=>updateSelectedClip({fadeOut:Number(e.target.value)})}/></label></div>}
            <nav className="editor-tool-dock" aria-label="Editing tools">{[{id:"edit",label:"Edit",icon:Scissors},{id:"audio",label:"Audio",icon:Music2},{id:"text",label:"Text",icon:Type},{id:"overlay",label:"Overlay",icon:Layers},{id:"effects",label:"Effects",icon:WandSparkles},{id:"captions",label:"Captions",icon:Captions},{id:"filters",label:"Filters",icon:SlidersHorizontal},{id:"adjust",label:"Adjust",icon:Palette},{id:"media",label:"Media",icon:Film},{id:"stickers",label:"Stickers",icon:Sticker},{id:"background",label:"Background",icon:ImageIcon},{id:"ratio",label:"Ratio",icon:Crop}].map(item=>{const Icon=item.icon;return <button key={item.id} className={activeTool===item.id?"active":""} onClick={()=>{setActiveTool(item.id);setActiveSubtool(item.id==="edit"?"select":"");if(item.id==="media")setShowAttachmentPicker(true);}}><Icon size={19}/><span>{item.label}</span></button>;})}</nav>
          </div>
          <div className="editor-status-line"><i/>{status}<small className="engine-adapter-status"> · Editing: {engineStack.editing.active} · Audio: {engineStack.audio.active} · Graphics: {engineStack.graphics.active}</small></div>
        </div>}
        {editorView==="import" && <div className="editor-subpage"><div className="editor-subpage-title"><button onClick={()=>setEditorView("workspace")}><ArrowLeft size={18}/></button><div><h2>Import media</h2><p>Add videos, photos and audio to this project.</p></div></div><button className="huge-import-zone" onClick={()=>setShowAttachmentPicker(true)}><Plus size={38}/><b>Choose from gallery</b><span>Open your phone gallery to select photos and videos</span><small>Photos · Videos · Audio · Files</small></button><div className="imported-media-list"><h3>Imported media ({assets.length})</h3>{assets.map(a=><div key={a.id}><span>{a.kind==="audio"?<Music2/>:a.kind==="image"?<ImageIcon/>:<Film/>}</span><b>{a.name}</b><small>{a.kind.toUpperCase()} · {a.duration?clock(a.duration):"Reading…"}</small><button onClick={()=>{add(a);setEditorView("workspace");}}><Plus size={16}/> Add</button></div>)}</div></div>}
        {editorView==="export" && <div className="editor-subpage export-subpage"><div className="editor-subpage-title"><button onClick={()=>setEditorView("workspace")}><ArrowLeft size={18}/></button><div><h2>Export video</h2><p>Choose the quality and format for your finished video.</p></div></div><div className="export-center-layout"><div className="export-completion-card"><div className="export-big-icon"><Film size={32}/></div><h3>Ready to export</h3><p>{projectName} · {clock(duration)} · {clips.length} clips · {imageLayers.length + textLayers.length} overlay layers</p><div className="export-summary-row"><span>Resolution</span><b>{exportQuality}</b></div><div className="export-summary-row"><span>Frame rate</span><b>{exportFps}</b></div><div className="export-summary-row"><span>Aspect ratio</span><b>{aspectRatio}</b></div><button className="export-render-button" disabled={exportBusy || !hasExportableContent} onClick={()=>void startVideoExport()}><ArrowDownToLine size={18}/> {exportBusy ? "Rendering " + exportProgress + "%" : "Export video"}</button>{exportBusy && <><div className="nexus-export-progress"><i style={{width:exportProgress+"%"}}/></div><button className="outline-button" onClick={cancelVideoExport}>Cancel export</button></>}<small>Browser renderer · MP4 when supported, otherwise WebM · includes timeline video, images, timed text and audio clips. Keep this tab open while rendering.</small>{isNativeAndroid() && <><button className="outline-button" disabled={exportBusy || !selectedClip || !asset || asset.kind !== "video"} onClick={()=>void startNativeClipTranscode()}><Film size={16}/> Native Android clip transcode</button><small>Media3 transcodes one selected source video to MP4. It does not include timeline overlays, transitions or other clips.</small></>}</div><div className="export-options-panel"><h3>Social export preset</h3><label>Platform preset<select value={exportPreset} onChange={e=>applyExportPreset(e.target.value)}><option>TikTok / Reels / Shorts</option><option>YouTube</option><option>YouTube 4K</option><option>Instagram square</option><option>Instagram portrait</option><option>Facebook landscape</option><option>WhatsApp status</option></select></label><small>Presets set a starting aspect ratio, resolution and frame rate. You can customise the settings below.</small><h3>Export options</h3><label>Video quality<select value={exportQuality} onChange={e=>setExportQuality(e.target.value)}><option>720p</option><option>1080p</option><option>2K</option><option>4K Ultra HD</option></select></label><label>Frame rate<select value={exportFps} onChange={e=>setExportFps(e.target.value)}><option>24 FPS</option><option>30 FPS</option><option>60 FPS</option></select></label><button className="export-quick-action" disabled={!selectedClip} onClick={()=>{setPage("editor");setEditorView("workspace");setActiveTool("edit");setActiveSubtool("speed");setStatus("Select a clip to adjust its playback speed.");}}><Gauge size={18}/> Adjust selected clip speed</button><h3>Share destinations</h3><div className="export-share-grid">{["TikTok","YouTube","WhatsApp","Instagram","Facebook","Other"].map((name,i)=><button key={name} disabled><Share2 size={17}/><span>{name}</span></button>)}</div><small>Share options appear after a video has been rendered and saved to your device.</small></div></div></div>}

      </section>}

      {page === "projects" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">YOUR CREATIONS</div><h1>My projects</h1><p>All your creative work, in one place.</p></div><button className="gradient-button" onClick={() => { setProjectName("Untitled Project"); setClips([]); setAssets([]); setPage("editor"); }}><Plus size={16}/> New project</button></div><div className="project-filter"><button className="filter-active">All projects</button><button>Videos</button><button>Drafts</button><span>{recent.length} projects</span></div><div className="project-grid">{recent.filter(n => n.toLowerCase().includes(search.toLowerCase())).map((name, i) => <button className="project-tile" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>PROJECT / 0{i + 1}</span></div><div><b>{name}</b><small>Local project · {i === 0 ? "Today" : i === 1 ? "Yesterday" : "2 days ago"}</small></div></button>)}</div></section>}

      {page === "templates" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">A LITTLE CREATIVE INSPIRATION</div><h1>Explore templates</h1><p>Choose a starting point for your next story.</p></div></div><div className="category-tabs">{["All", "Lifestyle", "Gaming", "Business", "Product", "Education", "Creator", "Events", "Sports"].map(c => <button key={c} className={templateCategory === c ? "tab-active" : ""} onClick={() => setTemplateCategory(c)}>{c}</button>)}</div><div className="template-grid">{filteredTemplates.map(t => <button className="template-card" key={t.name} onClick={() => applyCreativeTemplate(t)}><div className={"template-art " + t.color} style={{background:t.gradient}}><span className="template-play"><Play size={18} fill="currentColor"/></span><small>{t.length}</small></div><div><b>{t.name}</b><small>{t.type} · {t.ratio} · {t.filter}</small></div></button>)}</div></section>}



      {page === "settings" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Settings</h1><p>Manage your workspace preferences.</p></div></div><div className="settings-layout"><div className="settings-nav"><b>Preferences</b><span>Appearance</span><span>Workspace</span><span>About</span></div><div className="settings-content"><h2>NEXUS engine status</h2><p>Live configuration check from the secure server. Unconfigured engines use the fallback listed here.</p>
          <div className="engine-status-grid">
            <div className="setting-row"><span><b>Cloudflare Worker connection</b><small>{workerHealth?.message || "Checking the deployed Worker health endpoint…"}</small></span><span className="setting-value">{workerHealth ? (workerHealth.ok ? "Online" : "Not connected") : "Checking…"}</span></div>
            <div className="setting-row"><span><b>AI Director brain</b><small>{engineAvailability?.brain.model || "Model not configured"}</small></span><span className="setting-value">{engineAvailability ? (engineAvailability.brain.configured ? "Connected" : "Key needed") : "Checking…"}</span></div>
            {Object.entries(engineAvailability?.engines || {}).map(([name,engine])=><div className="setting-row" key={name}><span><b>{name.toUpperCase()} engine</b><small>{engine.configured ? engine.provider : engine.fallback}</small></span><span className="setting-value">{engine.configured ? "Connected" : "Fallback"}</span></div>)}
          </div>
            <div className="setting-row"><span><b>Worker diagnostics</b><small>{workerHealth?.checkedAt ? "Last checked " + new Date(workerHealth.checkedAt).toLocaleTimeString() : "Run a fresh connection check before generating."}</small></span><button className="outline-button" onClick={() => { setWorkerHealth(null); checkNexusWorker().then(setWorkerHealth).catch(error => setWorkerHealth({ ok:false, status:"unavailable", message:error instanceof Error ? error.message : "Worker health check failed.", checkedAt:Date.now() })); }}>Check connection</button></div>
          <h2>Speech transcription engines</h2><p>Choose a local engine for privacy or the online provider for cloud transcription.</p>
          <div className="setting-row"><span><b>Engine</b><small>Whisper and Vosk run in your browser after their models are available.</small></span><select value={transcriptionEngine} onChange={e=>setTranscriptionEngine(e.target.value as "whisper"|"vosk"|"groq")}><option value="whisper">Offline Whisper · Tiny</option><option value="vosk">Offline Vosk</option><option value="groq">Online API · Groq</option></select></div>
          <div className="setting-row"><span><b>Selected media</b><small>{asset?.name || "No selected audio/video clip"}</small></span><button onClick={()=>setPage("editor")}>Open editor</button></div>
          <button className="gradient-button" disabled={transcriptionBusy} onClick={runTranscription}>{transcriptionBusy ? "Transcribing…" : "Transcribe selected media"}</button>
          <p className="engine-adapter-status">{transcriptionStatus}</p>
          {transcriptionText && <><textarea readOnly value={transcriptionText} rows={8} aria-label="Transcription result" /><button className="outline-button" onClick={addTranscriptionCaptions}>Add timed captions to timeline</button></>}
          <small>Online mode requires GROQ_API_KEY in Vercel. Vosk requires a compatible Vosk browser model archive URL in VITE_VOSK_MODEL_URL. Whisper downloads and caches its model on first use.</small>
          <h2>Appearance</h2><p>Choose how NEXUS EDITOR looks on your device.</p><div className="setting-row"><span><b>Dark appearance</b><small>Use the dark creative workspace theme.</small></span><button className={darkMode ? "toggle on" : "toggle"} onClick={() => setDarkMode(!darkMode)}><i/></button></div><div className="theme-picker-block">
            <div className="theme-picker-heading"><b>Colour theme</b><small>Pick the colour style for your entire workspace.</small></div>
            <div className="theme-options">{themes.map(t => <button key={t.id} className={theme === t.id ? "theme-option selected" : "theme-option"} onClick={() => changeTheme(t.id)} aria-pressed={theme === t.id}><span className="theme-swatches">{t.colors.map((color, i) => <i key={i} style={{ background: color }} />)}</span><span className="theme-option-name">{t.name}</span>{theme === t.id && <Check size={15} className="theme-check" />}</button>)}</div>
          </div>
          <div className="setting-row"><span><b>Workspace storage</b><small>Projects and media remain on this device.</small></span><span className="setting-value">Local</span></div><div className="setting-row"><span><b>Project format</b><small>Portable NEXUS project metadata.</small></span><span className="setting-value">.nexusproj</span></div><div className="about-card"><span className="brand-mark">N</span><div><b>NEXUS EDITOR</b><small>VELTRONIX NEXUS · Creative workspace</small></div></div></div></div></section>}
      <footer className="app-footer"><span>© VELTRONIX NEXUS</span><span>CREATE · EDIT · INSPIRE</span></footer>
    </main>
  </div>;
}
