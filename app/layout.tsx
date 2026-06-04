import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import config from "./config";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});
const description =
  "Phần mềm quản lý gia phả dòng tộc người Việt — lưu giữ, kết nối và truyền lại di sản nhiều thế hệ.";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: config.siteName,
    template: `%s | ${config.siteName}`,
  },
  description,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: config.siteUrl,
    siteName: config.siteName,
    title: config.siteName,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: config.siteName,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} font-sans antialiased relative`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
