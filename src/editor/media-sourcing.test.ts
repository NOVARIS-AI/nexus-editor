import { describe, expect, it } from "vitest";
import { isReusableMediaLicense, isSecureMediaUrl } from "./media-sourcing";

describe("hybrid media source safety and licence policy", () => {
  it("accepts public-domain and CC0 assets without requiring a named creator", () => {
    expect(isReusableMediaLicense("Public domain", "", "")).toBe(true);
    expect(isReusableMediaLicense("CC0 1.0", "", "")).toBe(true);
  });

  it("accepts attribution licences only when creator and secure licence URL are present", () => {
    expect(isReusableMediaLicense("CC BY 4.0", "Photographer", "https://creativecommons.org/licenses/by/4.0/")).toBe(true);
    expect(isReusableMediaLicense("CC BY-SA 4.0", "Artist", "https://creativecommons.org/licenses/by-sa/4.0/")).toBe(true);
    expect(isReusableMediaLicense("CC BY 4.0", "", "https://creativecommons.org/licenses/by/4.0/")).toBe(false);
    expect(isReusableMediaLicense("CC BY 4.0", "Artist", "http://creativecommons.org/licenses/by/4.0/")).toBe(false);
  });

  it("rejects non-commercial, no-derivatives and unknown licences", () => {
    expect(isReusableMediaLicense("CC BY-NC 4.0", "Artist", "https://creativecommons.org/licenses/by-nc/4.0/")).toBe(false);
    expect(isReusableMediaLicense("CC BY-ND 4.0", "Artist", "https://creativecommons.org/licenses/by-nd/4.0/")).toBe(false);
    expect(isReusableMediaLicense("All rights reserved", "Artist", "https://example.test/license")).toBe(false);
  });

  it("requires HTTPS and rejects credentials in media URLs", () => {
    expect(isSecureMediaUrl("https://commons.wikimedia.org/file.jpg")).toBe(true);
    expect(isSecureMediaUrl("http://commons.wikimedia.org/file.jpg")).toBe(false);
    expect(isSecureMediaUrl("https://user:pass@example.test/file.jpg")).toBe(false);
    expect(isSecureMediaUrl("javascript:alert(1)")).toBe(false);
  });
});
