import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],

  // ✅ Prevent trailing slash SEO duplication
  trailingSlash: false,

  // ✅ Enable compression (performance)
  compress: true,

  // ✅ Important for SEO migration from WP
  async redirects() {
    return [
      // WordPress category → new blogs
      {
        source: "/category/:slug*",
        destination: "/blogs/:slug*",
        permanent: true,
      },

      // WP year permalink → blog
      {
        source: "/:year/:month/:slug",
        destination: "/blogs/:slug",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/content",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
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
      { protocol: "https", hostname: "sheatwork.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;