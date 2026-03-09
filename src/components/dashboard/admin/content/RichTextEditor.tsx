// components/dashboard/admin/content/RichTextEditor.tsx
// Rich text editor built on Tiptap. Outputs clean HTML.
//
// Install deps:
//   npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
//     @tiptap/extension-link @tiptap/extension-image \
//     @tiptap/extension-placeholder @tiptap/extension-underline \
//     @tiptap/extension-text-align @tiptap/extension-character-count
"use client";

import { cn } from "@/lib/utils";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1, Heading2, Heading3,
  Italic,
  Link2Off,
  Link as LinkIcon,
  List, ListOrdered,
  Minus,
  Quote,
  Redo, RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md text-sm transition-colors",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        active
          ? "bg-primary text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl,  setLinkUrl]  = useState("");

  const setLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    setLinkUrl(prev);
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl.trim(), target: "_blank" }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="border-b border-border bg-muted/30 rounded-t-xl">
      {/* ── Row 1: text style + alignment ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        {/* Headings */}
        <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolBtn>

        <Divider />

        {/* Inline styles */}
        <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Inline code" active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </ToolBtn>

        <Divider />

        {/* Link */}
        <ToolBtn title="Add link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        {editor.isActive("link") && (
          <ToolBtn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
            <Link2Off className="h-4 w-4" />
          </ToolBtn>
        )}

        <Divider />

        {/* Lists */}
        <ToolBtn title="Bullet list" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Numbered list" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Blockquote" active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Code block" active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <span className="text-xs font-mono font-bold">{"<>"}</span>
        </ToolBtn>
        <ToolBtn title="Divider line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolBtn>

        <Divider />

        {/* Alignment */}
        <ToolBtn title="Align left" active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Align center" active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Align right" active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Justify" active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="h-4 w-4" />
        </ToolBtn>

        <Divider />

        {/* History */}
        <ToolBtn title="Undo (Ctrl+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Redo (Ctrl+Shift+Z)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolBtn>
      </div>

      {/* ── Link input popover ────────────────────────────────────────── */}
      {linkOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-background border-t border-border">
          <input
            autoFocus
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { setLinkOpen(false); setLinkUrl(""); }
            }}
            className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="button" onClick={applyLink}
            className="px-3 h-8 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90">
            Apply
          </button>
          <button type="button" onClick={() => { setLinkOpen(false); setLinkUrl(""); }}
            className="px-3 h-8 rounded-md border border-border text-xs hover:bg-muted">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value:      string;           // HTML string (controlled)
  onChange:   (html: string) => void;
  placeholder?: string;
  minHeight?: number;           // px, default 400
  className?: string;
  error?:     boolean;
}

export default function RichTextEditor({
  value, onChange, placeholder = "Write your content here…",
  minHeight = 400, className, error,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // StarterKit includes: paragraph, bold, italic, strike, code,
        // codeBlock, heading, bulletList, orderedList, blockquote,
        // horizontalRule, hardBreak, history, dropcursor, gapcursor
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      // Return empty string instead of empty paragraph HTML
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
  });

  // Sync external value changes (e.g. when edit page loads initial data)
  useEffect(() => {
    if (!editor) return;
    // Only update if content actually differs to avoid cursor jump
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  const wordCount = editor
    ? editor.storage.characterCount.words()
    : 0;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-colors",
      error
        ? "border-red-400 focus-within:ring-2 focus-within:ring-red-400"
        : "border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
      className
    )}>
      {editor && <Toolbar editor={editor} />}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={cn(
          "px-4 py-3 bg-background text-foreground overflow-y-auto",
          // Prose styles for the content
          "[&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none",
          // Placeholder
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          // Headings
          "[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-5 [&_.ProseMirror_h1]:mb-2",
          "[&_.ProseMirror_h2]:text-xl  [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2",
          "[&_.ProseMirror_h3]:text-lg  [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1",
          // Paragraph
          "[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-relaxed",
          // Lists
          "[&_.ProseMirror_ul]:list-disc   [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:my-2",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:my-2",
          "[&_.ProseMirror_li]:my-1",
          // Blockquote
          "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/40",
          "[&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:my-3",
          "[&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:italic",
          // Code
          "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5",
          "[&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono",
          "[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:my-3",
          "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0",
          // Links
          "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:cursor-pointer",
          // HR
          "[&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-4",
          // Strong / em / u / s
          "[&_.ProseMirror_strong]:font-bold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_u]:underline",
          "[&_.ProseMirror_s]:line-through",
        )}
      />

      {/* Footer: word count */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 border-t border-border">
        <span className="text-[11px] text-muted-foreground">
          {wordCount} word{wordCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Rich text · HTML output
        </span>
      </div>
    </div>
  );
}