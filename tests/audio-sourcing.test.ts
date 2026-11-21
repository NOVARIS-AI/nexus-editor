import { afterEach, describe, expect, it, vi } from "vitest";
import { searchWikimediaCommonsAudio } from "../src/editor/audio-sourcing";

const originalFetch = globalThis.fetch;

function commonsResponse(pages: Record<string, unknown>) {
  return new Response(JSON.stringify({ query: { pages } }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

describe("licensed online audio sourcing", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("searches Commons audio and preserves attribution and license metadata", async () => {
    const fetchMock = vi.fn(async () => commonsResponse({
      "42": {
        pageid: 42,
        title: "File:Ambient forest.ogg",
        imageinfo: [{
          url: "https://upload.wikimedia.org/audio.ogg",
          descriptionurl: "https://commons.wikimedia.org/wiki/File:Ambient_forest.ogg",
          extmetadata: {
            MIMEType: { value: "audio/ogg" },
            LicenseShortName: { value: "CC BY-SA 4.0" },
            LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
            Artist: { value: "Example Artist" },
            Attribution: { value: "Example Artist / Wikimedia Commons" }
          }
        }]
      }
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const results = await searchWikimediaCommonsAudio("forest ambience");

    expect(fetchMock).toHaveBeenCalledOnce();
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("gsrsearch")).toBe("forest ambience");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "42",
      title: "Ambient forest.ogg",
      creator: "Example Artist",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution: "Example Artist / Wikimedia Commons",
      mimeType: "audio/ogg",
      downloadUrl: "https://upload.wikimedia.org/audio.ogg"
    });
  });

  it("excludes non-audio files and files without a declared license", async () => {
    globalThis.fetch = vi.fn(async () => commonsResponse({
      "1": { pageid: 1, title: "File:Poster.jpg", imageinfo: [{ url: "https://example.com/poster.jpg", extmetadata: { MIMEType: { value: "image/jpeg" }, LicenseShortName: { value: "CC BY 4.0" } } }] },
      "2": { pageid: 2, title: "File:Unknown.mp3", imageinfo: [{ url: "https://example.com/unknown.mp3", extmetadata: { MIMEType: { value: "audio/mpeg" } } }] }
    })) as unknown as typeof fetch;

    await expect(searchWikimediaCommonsAudio("ambient")).resolves.toEqual([]);
  });

  it("uses a safe default query and surfaces service failures", async () => {
    const fetchMock = vi.fn(async () => new Response("unavailable", { status: 503 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(searchWikimediaCommonsAudio("   ")).rejects.toThrow("Licensed audio search is temporarily unavailable.");
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("gsrsearch")).toBe("background music");
  });

  it("forwards cancellation to the Commons request", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return commonsResponse({});
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await searchWikimediaCommonsAudio("rain", controller.signal);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
