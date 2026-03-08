// components/blogs/BlogPostContent.tsx
"use client";

// ✅ No useEffect needed — useState lazy initializer runs synchronously on mount
// This eliminates the spinner flash that happened with the old useEffect approach.
// DOMPurify is browser-only which is fine since this is a "use client" component.

import { useState } from "react";
import { BlogWordPressConverter } from "@/lib/blog-wordpress-converter";

interface BlogPostContentProps {
  content: string;
}

export default function BlogPostContent({ content }: BlogPostContentProps) {
  // Lazy initializer: runs once synchronously, no extra render cycle
  const [processedContent] = useState<string>(
    () => BlogWordPressConverter.convert(content ?? "")
  );

  if (!processedContent) return null;

  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}