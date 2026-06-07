import { describe, it, expect } from "bun:test";
import { parseDeviceType, parseDeviceLabel } from "./shareAnalytics";

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
