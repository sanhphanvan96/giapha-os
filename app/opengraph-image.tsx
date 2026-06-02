import { ImageResponse } from "next/og";
import config from "./config";

export const runtime = "edge";
export const alt = config.siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Load Dancing Script for handwriting feel with Vietnamese support
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Yeseva+One&display=swap"
  ).then((r) => r.text());
  const fontUrl = css.match(/url\((.+?)\)/)?.[1];
  const fontData = fontUrl
    ? await fetch(fontUrl).then((r) => r.arrayBuffer())
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #f97316 45%, #ef4444 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 50px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative circles */}
        <div style={{ position: "absolute", left: "-160px", top: "-160px", width: "600px", height: "600px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex" }} />
        <div style={{ position: "absolute", right: "-100px", bottom: "-120px", width: "480px", height: "480px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", right: "200px", top: "40px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex" }} />

        {/* Frosted glass card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.18)",
            border: "1.5px solid rgba(255,255,255,0.35)",
            borderRadius: "32px",
            padding: "48px 72px",
            width: "100%",
            height: "100%",
            gap: "0px",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.3)",
              borderRadius: "100px",
              padding: "8px 22px",
              marginBottom: "32px",
            }}
          >
            <span style={{ color: "#fff", fontSize: "18px", fontWeight: 600, letterSpacing: "0.5px" }}>
              Website Gia Phả Online
            </span>
          </div>

          {/* Title — handwriting font */}
          <div
            style={{
              color: "#ffffff",
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.15,
              textAlign: "center",
              fontFamily: fontData ? "Yeseva One" : "serif",
              marginBottom: "20px",
              textShadow: "0 2px 16px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            {config.siteName}
          </div>

          {/* Divider */}
          <div style={{ width: "60px", height: "3px", background: "rgba(255,255,255,0.6)", borderRadius: "4px", marginBottom: "20px", display: "flex" }} />

          {/* Description */}
          <div
            style={{
              fontFamily: "sans-serif",
            color: "rgba(255,255,255,0.9)",
              fontSize: "26px",
              fontWeight: 400,
              lineHeight: 1.6,
              textAlign: "center",
              maxWidth: "620px",
            }}
          >
            Lưu giữ, kết nối và truyền lại di sản dòng tộc qua nhiều thế hệ
          </div>

          {/* URL */}
          <div style={{ marginTop: "32px", display: "flex" }}>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "20px", fontFamily: "sans-serif" }}>
              https://giaphaphangia.vercel.app
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? { fonts: [{ name: "Yeseva One", data: fontData, weight: 400, style: "normal" }] }
        : {}),
    }
  );
}
