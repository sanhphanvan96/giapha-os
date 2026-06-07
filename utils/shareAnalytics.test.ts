import { describe, it, expect } from "bun:test";
import { parseDeviceType, parseDeviceLabel, parseSource } from "./shareAnalytics";

describe("parseDeviceType", () => {
  it("detects mobile (iPhone)", () => {
    expect(parseDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)")).toBe("mobile");
  });
  it("detects tablet (iPad)", () => {
    expect(parseDeviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
  });
  it("detects desktop (macOS)", () => {
    expect(parseDeviceType("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("desktop");
  });
  it("detects desktop (Windows)", () => {
    expect(parseDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });
  it("detects mobile (Android)", () => {
    expect(parseDeviceType("Mozilla/5.0 (Linux; Android 13; SM-G991B) Mobile")).toBe("mobile");
  });
  it("returns unknown for null", () => {
    expect(parseDeviceType(null)).toBe("unknown");
  });
});

describe("parseDeviceLabel", () => {
  it("parses iPhone with iOS version", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
    expect(parseDeviceLabel(ua)).toBe("iPhone · iOS 17.5");
  });

  it("parses iPad with iPadOS version", () => {
    const ua = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(parseDeviceLabel(ua)).toBe("iPad · iPadOS 17.0");
  });

  it("parses Samsung Galaxy via SM code", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Mobile";
    expect(parseDeviceLabel(ua)).toBe("Samsung SM-S918B · Android 14");
  });

  it("parses Google Pixel", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile";
    expect(parseDeviceLabel(ua)).toBe("Google Pixel 8 · Android 14");
  });

  it("parses Redmi phone", () => {
    const ua = "Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 Mobile";
    expect(parseDeviceLabel(ua)).toBe("Redmi Note 12 · Android 13");
  });

  it("parses macOS with version", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
    expect(parseDeviceLabel(ua)).toBe("macOS 10.15");
  });

  it("parses Windows", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    expect(parseDeviceLabel(ua)).toBe("Windows");
  });

  it("returns Không xác định for null", () => {
    expect(parseDeviceLabel(null)).toBe("Không xác định");
  });
});

describe("parseSource", () => {
  const ZALO_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ZaloApp/3.0";
  const FB_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) FBAN/FBIOS;FBAV/400.0";
  const IG_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Instagram 300.0";
  const NORMAL_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120";

  it("detects Zalo in-app browser via UA (no referer)", () => {
    expect(parseSource(null, ZALO_UA)).toBe("Zalo");
  });

  it("detects Facebook in-app browser via UA (no referer)", () => {
    expect(parseSource(null, FB_UA)).toBe("Facebook");
  });

  it("detects Instagram in-app browser via UA (no referer)", () => {
    expect(parseSource(null, IG_UA)).toBe("Instagram");
  });

  it("shows Trực tiếp when no referer and no known UA", () => {
    expect(parseSource(null, NORMAL_UA)).toBe("Trực tiếp");
    expect(parseSource(null, null)).toBe("Trực tiếp");
  });

  it("parses hostname from referer when UA is normal", () => {
    expect(parseSource("https://www.google.com/search?q=gia+pha", NORMAL_UA)).toBe("Google");
    expect(parseSource("https://facebook.com/groups/123", NORMAL_UA)).toBe("Facebook");
    expect(parseSource("https://zalo.me/g/abc123", NORMAL_UA)).toBe("Zalo");
    expect(parseSource("https://news.zing.vn/bai-viet", NORMAL_UA)).toBe("news.zing.vn");
  });

  it("UA in-app detection takes priority over referer", () => {
    // Zalo UA + có referer giả → vẫn phải trả Zalo
    expect(parseSource("https://example.com", ZALO_UA)).toBe("Zalo");
  });
});
