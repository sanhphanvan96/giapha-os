import type { MetadataRoute } from "next";
import config from "./config";

export default function robots(): MetadataRoute.Robots {
  if (config.noindex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
