import type { NextConfig } from "next";

const isLocalDev =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost");

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  images: {
    // In local dev (Supabase local), bypass Next.js Image Optimization entirely.
    // The optimization server cannot fetch from private IPs (127.0.0.1).
    unoptimized: isLocalDev,
    // Cache optimized images for 1 year. Safe because avatar URLs include a
    // cache-busting ?t=<timestamp> query param that changes on every upload.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
