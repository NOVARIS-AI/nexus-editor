export interface SourcedMediaResult {
  id: string;
  title: string;
  fileName: string;
  thumbnailUrl: string;
  pageUrl: string;
  creator: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  mediaKind: "image" | "video";
  mimeType: string;
  downloadUrl: string;
}

type CommonsResponse = {
  query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }> };
};

const plain = (value?: string) => (value || "").replace(/<[^>]*>/g, " ").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function isSecureMediaUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}

export function isReusableMediaLicense(license: string, creator: string, licenseUrl: string): boolean {
  const normalised = license.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\bnon commercial\b|\bno derivatives\b|\bnd\b|\bnc\b/.test(normalised)) return false;
  if (/public domain|cc0|cc zero/.test(normalised)) return true;
  const attributionLicense = /cc by(?: sa)?(?: 1 0| 2 0| 2 5| 3 0| 4 0)?/.test(normalised);
  return attributionLicense && Boolean(creator.trim()) && isSecureMediaUrl(licenseUrl);
}

export async function searchWikimediaCommons(query: string, signal?: AbortSignal, limit = 10): Promise<SourcedMediaResult[]> {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query,
    gsrnamespace: "6", gsrlimit: String(Math.max(1, Math.min(50, Math.floor(limit)))), prop: "imageinfo", iiprop: "url|extmetadata",
    iiurlwidth: "640", format: "json", origin: "*"
  });
  const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Wikimedia Commons search is temporarily unavailable.");
  const data = await response.json() as CommonsResponse;
  return Object.values(data.query?.pages || {}).flatMap(page => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    const thumbnailUrl = info?.thumburl || info?.url;
    const downloadUrl = info?.url;
    const mimeType = plain(meta.MIMEType?.value) || "";
    const mediaKind = mimeType.startsWith("video/") ? "video" : mimeType.startsWith("image/") ? "image" : null;
    const license = plain(meta.LicenseShortName?.value);
    const creator = plain(meta.Artist?.value);
    const attribution = plain(meta.Attribution?.value || meta.Credit?.value || creator);
    const licenseUrl = plain(meta.LicenseUrl?.value);
    const pageUrl = info?.descriptionurl || "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_"));
    // Stage 4 only imports sources that can legally be adapted into an edited project.
    // Non-commercial and no-derivatives licences are intentionally excluded.
    const publicDomain = /public domain|cc0|cc zero/i.test(license);
    if (!thumbnailUrl || !downloadUrl || !license || !mediaKind || !isSecureMediaUrl(thumbnailUrl) || !isSecureMediaUrl(downloadUrl) || !isSecureMediaUrl(pageUrl)) return [];
    if (!isReusableMediaLicense(license, creator, licenseUrl)) return [];
    const safeAttribution = attribution || (publicDomain ? "Public domain; source page retained for provenance." : "");
    if (!safeAttribution) return [];
    return [{
      id: String(page.pageid), title: page.title.replace(/^File:/, ""),
      fileName: page.title.replace(/^File:/, ""), thumbnailUrl,
      pageUrl, creator, license, licenseUrl, attribution: safeAttribution, mediaKind, mimeType, downloadUrl
    }];
  });
}
