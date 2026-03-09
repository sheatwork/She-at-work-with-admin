// components/dashboard/admin/content/ImageUploader.tsx
// Reusable image uploader — signs via /api/admin/upload, then POSTs directly
// to Cloudinary. Returns the secure_url to the parent via onUpload().
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { cn } from "@/lib/utils";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface ImageUploaderProps {
  value:      string;                    // current URL (controlled)
  onChange:   (url: string) => void;     // called with new URL after upload
  folder?:    string;                    // Cloudinary folder (default: admin-content)
  label?:     string;
  className?: string;
}

type UploadState = "idle" | "signing" | "uploading" | "done" | "error";

export default function ImageUploader({
  value, onChange, folder = "admin-content", label = "Featured Image", className,
}: ImageUploaderProps) {
  const [state,    setState]    = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errMsg,   setErrMsg]   = useState<string | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = value || preview || null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrMsg("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrMsg("Image must be under 10 MB");
      return;
    }

    // Local preview immediately
    setPreview(URL.createObjectURL(file));
    setErrMsg(null);
    setState("signing");
    setProgress(0);

    try {
      // 1. Get signature from our API
      const signRes = await fetch("/api/admin/upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ folder }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = await signRes.json();

      // 2. Upload directly to Cloudinary
      setState("uploading");
      const formData = new FormData();
      formData.append("file",       file);
      formData.append("api_key",    apiKey);
      formData.append("timestamp",  String(timestamp));
      formData.append("signature",  signature);
      formData.append("folder",     signedFolder);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            onChange(data.secure_url);
            setPreview(null);
            setState("done");
            resolve();
          } else {
            reject(new Error("Cloudinary upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });

    } catch (err: any) {
      setErrMsg(err.message ?? "Upload failed");
      setState("error");
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const clear = () => {
    onChange("");
    setPreview(null);
    setState("idle");
    setErrMsg(null);
    setProgress(0);
  };

  const isLoading = state === "signing" || state === "uploading";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      )}

      {/* ── Preview ──────────────────────────────────────────────────── */}
      {displayUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Preview"
            className={cn(
              "w-full h-48 object-cover transition-opacity",
              isLoading && "opacity-40"
            )}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          {/* Progress overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="w-40 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {state === "signing" ? "Preparing…" : `${progress}%`}
              </p>
            </div>
          )}

          {/* Controls overlay — shown on hover when not loading */}
          {!isLoading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-foreground shadow hover:bg-muted transition-colors"
              >
                <Upload className="h-3.5 w-3.5" /> Replace
              </button>
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-red-600 shadow hover:bg-red-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Drop zone ──────────────────────────────────────────────── */
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isLoading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-2 border-dashed",
            "cursor-pointer transition-colors text-center px-4",
            isLoading
              ? "border-primary/40 bg-primary/5 cursor-default"
              : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <div className="w-40 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {state === "signing" ? "Preparing…" : `Uploading ${progress}%`}
              </p>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PNG, JPG, WEBP, GIF · max 10 MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── URL input fallback ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">or paste URL</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <input
        type="url"
        placeholder="https://res.cloudinary.com/…"
        value={value}
        onChange={(e) => { onChange(e.target.value); setState("idle"); setPreview(null); }}
        className={cn(
          "w-full h-9 rounded-md border border-input bg-background px-3 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        )}
      />

      {/* ── Error ───────────────────────────────────────────────────── */}
      {errMsg && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <X className="h-3 w-3" /> {errMsg}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}