import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  images: {
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
