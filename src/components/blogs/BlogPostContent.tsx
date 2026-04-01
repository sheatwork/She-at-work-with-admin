// components/blogs/BlogPostContent.tsx
"use client";

import { useState, useEffect } from "react";
import { BlogWordPressConverter } from "@/lib/blog-wordpress-converter";

interface BlogPostContentProps {
  content: string;
}

export default function BlogPostContent({ content }: BlogPostContentProps) {
  const [processedContent, setProcessedContent] = useState<string>("");

  useEffect(() => {
    // useEffect only runs in the browser — DOMPurify has window access here
    setProcessedContent(BlogWordPressConverter.convert(content ?? ""));
  }, [content]);

  if (!processedContent) return null;

  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}