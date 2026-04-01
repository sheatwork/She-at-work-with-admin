// lib/blog-wordpress-converter.ts
import DOMPurify from "dompurify";

export class BlogWordPressConverter {
  static convert(content: string): string {
    if (!content) return "";
    try {
      let c = this.removeBlockComments(content);
      c = this.decodeEntities(c);
      c = this.formatHashtags(c);
      c = this.formatResourceLists(c);
      c = this.formatStatistics(c);
      c = this.handleEmbeds(c);
      c = this.formatSectionHeaders(c);
      c = this.formatQuotes(c);
      c = this.cleanWordPressClasses(c);
      c = this.formatLists(c);
      c = this.formatParagraphs(c);
      c = this.finalCleanup(c);

      // Guard: DOMPurify requires window — only run in browser
      if (typeof window !== "undefined") {
        c = DOMPurify.sanitize(c, {
          ADD_TAGS: ["iframe"],
          ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "rel"],
        });
      }

      return c;
    } catch (err) {
      console.error("BlogWordPressConverter error:", err);
      return content;
    }
  }

  private static removeBlockComments(c: string): string {
    return c
      .replace(/<!--\s*\/?wp:[^>]*-->/g, "")
      .replace(/<!--.*?-->/g, "")
      .replace(/\[\/?[a-z_]+\]/g, "");
  }

  private static decodeEntities(c: string): string {
    return c
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "\u2019")
      .replace(/&#8216;/g, "\u2018")
      .replace(/&#8220;/g, "\u201C")
      .replace(/&#8221;/g, "\u201D")
      .replace(/&#8211;/g, "\u2013")
      .replace(/&#8212;/g, "\u2014")
      .replace(/&#038;/g, "&")
      .replace(/&hellip;/g, "…");
  }

  private static formatHashtags(c: string): string {
    return c.replace(
      /<p[^>]*>(\s*#[A-Za-z0-9#]+\s*(?:#[A-Za-z0-9#]+\s*)*)<\/p>/gi,
      (_, hashtags) => {
        const tags = hashtags
          .trim()
          .split(/\s+/)
          .map((t: string) => `<span class="blog-hashtag">${t}</span>`)
          .join(" ");
        return `<div class="blog-hashtag-container">${tags}</div>`;
      }
    );
  }

  private static formatResourceLists(c: string): string {
    return c
      .replace(
        /<li[^>]*>\s*<strong>(.*?)<\/strong>(.*?)<\/li>/gi,
        (_, bold, rest) =>
          `<li class="blog-resource-item"><span class="blog-resource-title">${bold}</span>${rest}</li>`
      )
      .replace(
        /<p[^>]*>\s*[•●]\s*<strong>(.*?)<\/strong>(.*?)<\/p>/gi,
        (_, bold, rest) =>
          `<div class="blog-resource-inline"><span class="blog-resource-title">${bold}</span>${rest}</div>`
      );
  }

  private static formatStatistics(c: string): string {
    return c
      .replace(/(\d+(?:\.\d+)?%)/g, '<span class="blog-stat">$1</span>')
      .replace(
        /([A-Z]?[$€£]\d+(?:[.,]\d+)?(?:\s*(?:million|billion|thousand|trillion))?)/gi,
        '<span class="blog-currency">$1</span>'
      );
  }

  private static handleEmbeds(c: string): string {
    return c
      .replace(
        /https:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/g,
        (_, id) =>
          `<div class="blog-video-container"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>`
      )
      .replace(
        /https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
        (_, id) =>
          `<div class="blog-video-container"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>`
      )
      .replace(
        /<a href="([^"]+)">(.*?)<\/a>/gi,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="blog-link">$2</a>'
      );
  }

  private static formatSectionHeaders(c: string): string {
    return c
      .replace(
        /<p[^>]*>\s*<strong>\s*In Focus:\s*([^<]+)<\/strong>\s*<\/p>/gi,
        '<div class="blog-section-header"><span class="blog-section-tag">IN FOCUS</span><h2>$1</h2></div>'
      )
      .replace(
        /<p[^>]*>\s*<strong>\s*On Stage:\s*([^<]+)<\/strong>\s*<\/p>/gi,
        '<div class="blog-section-header"><span class="blog-section-tag">ON STAGE</span><h2>$1</h2></div>'
      );
  }

  private static formatQuotes(c: string): string {
    return c.replace(
      /<p[^>]*>\s*["""]([^"""]+)["""]\s*<\/p>/gi,
      (_, q) =>
        `<figure class="blog-quote"><blockquote>${q.trim()}</blockquote></figure>`
    );
  }

  private static cleanWordPressClasses(c: string): string {
    return c
      .replace(/\s*class="wp-block-[^"]*"/g, "")
      .replace(/\s*class="has-[^"]*"/g, "")
      .replace(/\s*class="align[^"]*"/g, "")
      .replace(/\s*class="size-[^"]*"/g, "")
      .replace(/\s*style="[^"]*"/g, "")
      .replace(/<figure[^>]*>/g, "<figure>")
      .replace(/<figcaption[^>]*>/g, "<figcaption>");
  }

  private static formatLists(c: string): string {
    return c
      .replace(/<ul[^>]*>/g, '<ul class="blog-list">')
      .replace(/<ol[^>]*>/g, '<ol class="blog-list blog-list-numbered">')
      .replace(/<li[^>]*>/g, "<li>");
  }

  private static formatParagraphs(c: string): string {
    return c
      .replace(/<p>(?!\s*<)(.*?)<\/p>/g, (match, inner) => {
        if (match.includes("blog-")) return match;
        return `<p class="blog-paragraph">${inner}</p>`;
      })
      .replace(/<p[^>]*>\s*<\/p>/g, "");
  }

  private static finalCleanup(c: string): string {
    return c
      .replace(/\n{3,}/g, "\n\n")
      .replace(/(<\/h[1-6]>)/g, "$1\n")
      .replace(/(<\/div>)/g, "$1\n");
  }

  static extractExcerpt(content: string, maxLength = 160): string {
    if (!content) return "";
    const text = content
      .replace(/<[^>]*>/g, " ")
      .replace(/#[A-Za-z0-9#]+\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text.length <= maxLength
      ? text
      : text.substring(0, maxLength).trim() + "…";
  }

  static calculateReadTime(content: string): string {
    if (!content) return "1 min read";
    const words = content
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  }

  static formatDate(dateString: string): string {
    if (!dateString) return "Date unavailable";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "Date unavailable";
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Date unavailable";
    }
  }
}