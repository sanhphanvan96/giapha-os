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
