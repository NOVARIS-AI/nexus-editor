import { supabase } from "../lib/supabase";

export type CommunityUploadDetails = {
  caption: string;
  visibility: "public" | "followers" | "private";
  commentsEnabled: boolean;
  remixEnabled: boolean;
  durationSeconds: number;
};

export type CommunityUploadResult = { assetId: string; postId: string };

export async function uploadVideoForReview(
  file: File,
  details: CommunityUploadDetails,
  onProgress: (percent: number) => void
): Promise<CommunityUploadResult> {
  if (!supabase) throw new Error("NEXUS sign-in is not configured in this build.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in before uploading a community video.");

  const prepared = await fetch("/api/social/create-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds: details.durationSeconds,
      caption: details.caption,
      visibility: details.visibility,
      commentsEnabled: details.commentsEnabled,
      remixEnabled: details.remixEnabled
    })
  });
  const payload = await prepared.json().catch(() => ({})) as {
    error?: string; uploadUrl?: string; assetId?: string; postId?: string;
  };
  if (!prepared.ok || !payload.uploadUrl || !payload.assetId || !payload.postId)
    throw new Error(payload.error || "NEXUS could not prepare the secure upload.");

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", payload.uploadUrl!);
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) { onProgress(100); resolve(); }
      else reject(new Error("The video upload was rejected. Check your connection and try again."));
    };
    request.onerror = () => reject(new Error("Network connection interrupted during upload."));
    request.onabort = () => reject(new Error("Video upload was cancelled."));
    const form = new FormData();
    form.append("file", file, file.name);
    request.send(form);
  });

  return { assetId: payload.assetId, postId: payload.postId };
}
