import { supabase } from "../lib/supabase";

export type VideoUploadDraftResult = {
  postId: string;
  mediaAssetId: string;
  state: "ready" | "processing";
  message: string;
};

type UploadIntent = {
  postId: string;
  mediaAssetId: string;
  uploadUrl: string;
  maxBytes: number;
  message: string;
};

async function accessToken() {
  if (!supabase) throw new Error("NEXUS sign-in is not configured in this build.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to upload a video to NEXUS.");
  return token;
}

function uploadFile(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("The video provider rejected the upload. Please retry with an MP4 or WebM file."));
    };
    request.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    request.onabort = () => reject(new Error("Upload cancelled."));
    const form = new FormData();
    form.append("file", file, file.name);
    request.send(form);
  });
}

export async function uploadVideoDraft(
  file: File,
  details: {
    projectName: string;
    caption: string;
    visibility: "public" | "followers" | "private";
    commentsEnabled: boolean;
    remixEnabled: boolean;
    topics?: string[];
  },
  onProgress: (value: number) => void,
  onStage: (message: string) => void
): Promise<VideoUploadDraftResult> {
  if (!file.type.startsWith("video/")) throw new Error("Choose a video file.");
  if (file.size <= 0 || file.size > 200 * 1024 * 1024) throw new Error("Choose a video smaller than 200 MB.");
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type.toLowerCase())) {
    throw new Error("Supported formats are MP4, WebM and QuickTime.");
  }

  const token = await accessToken();
  onStage("Preparing a private upload…");
  const intentResponse = await fetch("/api/social/upload-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      filename: file.name, mimeType: file.type, sizeBytes: file.size,
      projectName: details.projectName, caption: details.caption,
      visibility: details.visibility, commentsEnabled: details.commentsEnabled,
      remixEnabled: details.remixEnabled, topics: details.topics || []
    })
  });
  const intent = await intentResponse.json().catch(() => ({})) as UploadIntent & { error?: string };
  if (!intentResponse.ok) throw new Error(intent.error || "Could not prepare the secure upload.");
  onStage("Uploading video securely…");
  await uploadFile(intent.uploadUrl, file, onProgress);

  onStage("Upload received. Checking video processing…");
  const deadline = Date.now() + 2 * 60 * 1000;
  let latestState: "ready" | "processing" = "processing";
  while (Date.now() < deadline) {
    const statusResponse = await fetch("/api/social/upload-status?mediaAssetId=" + encodeURIComponent(intent.mediaAssetId), {
      headers: { Authorization: "Bearer " + token }, cache: "no-store"
    });
    const status = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) throw new Error(status.error || "Could not check video processing.");
    if (status.state === "failed") throw new Error("The video provider could not process this file. Your private draft was not published.");
    if (status.state === "ready") { latestState = "ready"; break; }
    await new Promise(resolve => window.setTimeout(resolve, 5000));
  }
  return {
    postId: intent.postId,
    mediaAssetId: intent.mediaAssetId,
    state: latestState,
    message: latestState === "ready"
      ? "Video uploaded and processed. It is saved as a private draft pending moderation; it is not in the public feed."
      : "Video uploaded. Processing is taking longer than expected; your private draft is saved and can be checked again later."
  };
}
