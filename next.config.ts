// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],

  // Force Vercel's CDN to cache content API responses.
  // Without this, Vercel ignores Cache-Control headers set inside route handlers
  // for dynamic routes. This config applies them at the infrastructure level.
  async headers() {
    return [
      {
        // Content listing API — cache 60s, serve stale for 5 min while revalidating
        source: "/api/content",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // Content detail API — cache 5 min, serve stale for 10 min
        source: "/api/content/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sheatwork.com",              pathname: "/**" },
      { protocol: "http",  hostname: "sheatwork.com",              pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com",        pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com",         pathname: "/**" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;