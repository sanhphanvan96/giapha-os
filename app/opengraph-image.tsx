import { ImageResponse } from "next/og";
import config from "./config";

export const runtime = "edge";
export const alt = config.siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@700;800&display=swap"
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
          padding: "28px",
        }}
      >
        {/* White card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "56px 80px",
            gap: "0px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle decorative circle top-right */}
          <div style={{ position: "absolute", right: "-80px", top: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(249,115,22,0.07)", display: "flex" }} />
          <div style={{ position: "absolute", left: "-60px", bottom: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(245,158,11,0.06)", display: "flex" }} />

          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(135deg, #fef3c7, #fed7aa)",
              borderRadius: "100px",
              padding: "8px 22px",
              marginBottom: "28px",
            }}
          >
            <span style={{ color: "#c2410c", fontSize: "18px", fontWeight: 700, fontFamily: fontData ? "Be Vietnam Pro" : "sans-serif" }}>
              Website Gia Phả Online
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              color: "#1c1917",
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.1,
              textAlign: "center",
              fontFamily: fontData ? "Be Vietnam Pro" : "sans-serif",
              marginBottom: "16px",
              whiteSpace: "nowrap",
            }}
          >
            {config.siteName}
          </div>

          {/* Divider */}
          <div style={{ width: "48px", height: "4px", background: "linear-gradient(90deg, #f59e0b, #ef4444)", borderRadius: "4px", marginBottom: "20px", display: "flex" }} />

          {/* Description */}
          <div
            style={{
              color: "#57534e",
              fontSize: "26px",
              fontWeight: 400,
              lineHeight: 1.6,
              textAlign: "center",
              maxWidth: "640px",
              fontFamily: fontData ? "Be Vietnam Pro" : "sans-serif",
            }}
          >
            Lưu giữ, kết nối và truyền lại di sản dòng tộc qua nhiều thế hệ
          </div>

          {/* URL */}
          <div style={{ marginTop: "28px", display: "flex" }}>
            <span style={{ color: "#a8a29e", fontSize: "20px", fontFamily: "sans-serif" }}>
              https://giaphaphangia.vercel.app
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? { fonts: [{ name: "Be Vietnam Pro", data: fontData, weight: 800, style: "normal" }] }
        : {}),
    }
  );
}
