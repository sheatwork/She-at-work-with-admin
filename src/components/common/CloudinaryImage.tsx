"use client";
// next/image for database-sourced (Cloudinary) images.
//
// A client component because a loader is a function, and functions cannot be
// passed from a Server Component to next/image. Non-Cloudinary sources fall
// through to a plain <Image> with the props unchanged.
import Image, { type ImageProps } from "next/image";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/cloudinary";

// `alt` is required by ImageProps and passed through via the spread, which the
// a11y lint rule cannot see.
/* eslint-disable jsx-a11y/alt-text */
export function CloudinaryImage(props: ImageProps) {
  if (typeof props.src === "string" && isCloudinaryUrl(props.src)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { unoptimized, ...rest } = props;
    return <Image {...rest} loader={cloudinaryLoader} />;
  }
  return <Image {...props} />;
}
