// lib/cloudinary.ts
// Cloudinary does the resizing for every article image, instead of Vercel's
// Image Optimization (billed per transformation, plus function CPU on a miss).
// All content.featured_image values are res.cloudinary.com URLs.
import type { ImageLoaderProps } from "next/image";

const UPLOAD = "/upload/";

export function isCloudinaryUrl(src: string): boolean {
  return src.startsWith("https://res.cloudinary.com/") && src.includes(UPLOAD);
}

/**
 * next/image loader: Next still builds the responsive srcset, but each width is
 * a Cloudinary transformation URL (cached on Cloudinary's CDN).
 * c_limit never upscales; f_auto/q_auto pick WebP/AVIF and quality per browser.
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const i = src.indexOf(UPLOAD);
  const head = src.slice(0, i + UPLOAD.length);
  const tail = src.slice(i + UPLOAD.length);
  return `${head}f_auto,q_${quality ?? "auto"},c_limit,w_${width}/${tail}`;
}
