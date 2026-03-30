// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],

  // Force Vercel's CDN to cache content API responses.
  // Without this, Vercel ignores Cache-Control headers set inside route handlers
  // for dynamic routes. This config applies them at the infrastructure level.
  // next.config.ts
async headers() {
  return [
    {
      // Let the route handler set Cache-Control per endpoint type
      // (meta=600s, suggestions=30s, listing=60s)
      // Only set Vary so CDN caches per query string correctly
      source: "/api/content",
      headers: [
        {
          key: "Vary",
          value: "Accept-Encoding",
        },
      ],
    },
    {
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