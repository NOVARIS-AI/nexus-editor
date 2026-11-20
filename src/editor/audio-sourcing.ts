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
    if (!info?.url || !mimeType.startsWith("audio/") || !license) return [];
    const title = page.title.replace(/^File:/, "");
    const creator = plain(meta.Artist?.value);
    return [{
      id: String(page.pageid), title, fileName: title, pageUrl: info.descriptionurl ||
        "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")),
      creator, license, licenseUrl: plain(meta.LicenseUrl?.value),
      attribution: plain(meta.Attribution?.value || meta.Credit?.value || creator),
      mimeType, downloadUrl: info.url
    }];
  });
}
