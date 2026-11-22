import { isReusableMediaLicense, isSecureMediaUrl } from "./media-sourcing";
export type SourcedAudioResult = {
  id: string; title: string; fileName: string; pageUrl: string; creator: string;
  license: string; licenseUrl: string; attribution: string; mimeType: string; downloadUrl: string;
};
type CommonsAudioResponse = { query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: { url?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }> } };
const plain = (value?: string) => (value || "").replace(/<[^>]*>/g, " ").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export async function searchWikimediaCommonsAudio(query: string, signal?: AbortSignal): Promise<SourcedAudioResult[]> {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query.trim() || "background music",
    gsrnamespace: "6", gsrlimit: "20", prop: "imageinfo", iiprop: "url|extmetadata",
    format: "json", origin: "*"
  });
  const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), {
    signal, headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error("Licensed audio search is temporarily unavailable.");
  const data = await response.json() as CommonsAudioResponse;
  return Object.values(data.query?.pages || {}).flatMap(page => {
    const info = page.imageinfo?.[0], meta = info?.extmetadata || {};
    const mimeType = plain(meta.MIMEType?.value).toLowerCase();
    const license = plain(meta.LicenseShortName?.value);
    const title = page.title.replace(/^File:/, "");
    const creator = plain(meta.Artist?.value);
    const licenseUrl = plain(meta.LicenseUrl?.value);
    const pageUrl = info?.descriptionurl ||
      "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_"));
    const attribution = plain(meta.Attribution?.value || meta.Credit?.value || creator);
    const publicDomain = /public domain|cc0|cc zero/i.test(license);
    if (!info?.url || !mimeType.startsWith("audio/") || !license ||
      !isSecureMediaUrl(info.url) || !isSecureMediaUrl(pageUrl) ||
      !isReusableMediaLicense(license, creator, licenseUrl)) return [];
    const safeAttribution = attribution || (publicDomain ? "Public domain; source page retained for provenance." : "");
    if (!safeAttribution) return [];
    return [{
      id: String(page.pageid), title, fileName: title, pageUrl,
      creator, license, licenseUrl, attribution: safeAttribution,
      mimeType, downloadUrl: info.url
    }];
  });
}
