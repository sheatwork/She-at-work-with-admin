// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ❌ REMOVED: reactCompiler — not a valid Next.js 15 config key.
  //    Was throwing "Unrecognized key(s) in object: 'reactCompiler'" on every build.
  //    The React Compiler is configured via Babel/SWC plugins separately if needed.

  // Packages that use Node.js-only APIs (fs, net, etc.) and must not be
  // bundled for the browser. jsdom uses XMLHttpRequest + DOM APIs that don't
  // exist in the edge runtime — marking it external prevents bundling errors.
  serverExternalPackages: ["jsdom"],

  images: {
    // Serve Next.js-optimized images from these external hostnames.
    // Each entry is as specific as possible (no wildcard hostnames).
    remotePatterns: [
      // sheatwork.com assets — allow both http and https
      // (http kept for legacy CDN URLs already in the DB)
      {
        protocol: "https",
        hostname: "sheatwork.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "sheatwork.com",
        pathname: "/**",
      },
      // Stock photography
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      // Cloudinary (uploaded media / transformed images)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Google encrypted thumbnails (used in press/news content)
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;