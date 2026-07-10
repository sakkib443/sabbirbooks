/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { LuImageOff, LuPlay } from "react-icons/lu";
import { cn } from "@/components/ui";

// ------------------------------------------------------------------
// Types — mirror the /api/qr/:slug block contract.
// ------------------------------------------------------------------
export type QrBlockType = "text" | "image" | "video";

export interface QrBlock {
  type: QrBlockType | string;
  value: string;
  caption?: string;
}

// ------------------------------------------------------------------
// Video helpers — turn common YouTube / Vimeo URLs into embed URLs.
// Returns null when the URL is not a recognised embeddable provider,
// in which case we fall back to a native <video> element.
// ------------------------------------------------------------------
function getEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube — youtu.be/ID, /watch?v=ID, /embed/ID, /shorts/ID
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return raw;
      const short = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (short) return `https://www.youtube.com/embed/${short[1]}`;
    }

    // Vimeo — vimeo.com/ID or player.vimeo.com/video/ID
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "player.vimeo.com") return raw;

    return null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Caption — shared small muted line under any block.
// ------------------------------------------------------------------
function Caption({ text, bn }: { text?: string; bn: string }) {
  if (!text) return null;
  return (
    <p className={cn("mt-2 px-1 text-center text-xs leading-relaxed text-muted-foreground", bn)}>
      {text}
    </p>
  );
}

// ------------------------------------------------------------------
// ResourceBlock — renders one block by its `type`.
// ------------------------------------------------------------------
export function ResourceBlock({ block, bn = "" }: { block: QrBlock; bn?: string }) {
  const [imgError, setImgError] = useState(false);

  // ---- TEXT ------------------------------------------------------
  if (block.type === "text") {
    return (
      <div>
        <div
          className={cn(
            // whitespace-pre-line preserves the author's line breaks.
            "whitespace-pre-line text-[15.5px] leading-7 text-foreground/90 sm:text-base sm:leading-8",
            bn
          )}
        >
          {block.value}
        </div>
        <Caption text={block.caption} bn={bn} />
      </div>
    );
  }

  // ---- IMAGE -----------------------------------------------------
  if (block.type === "image") {
    return (
      <figure>
        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
          {imgError ? (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <LuImageOff className="text-3xl" />
              <span className={cn("text-xs", bn)}>{bn ? "ছবি লোড হয়নি" : "Image unavailable"}</span>
            </div>
          ) : (
            <img
              src={block.value}
              alt={block.caption || ""}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-auto w-full object-contain"
            />
          )}
        </div>
        <Caption text={block.caption} bn={bn} />
      </figure>
    );
  }

  // ---- VIDEO -----------------------------------------------------
  if (block.type === "video") {
    const embed = getEmbedUrl(block.value);
    return (
      <figure>
        <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-soft">
          {embed ? (
            <div className="relative aspect-video w-full">
              <iframe
                src={embed}
                title={block.caption || "Video"}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              src={block.value}
              className="h-auto max-h-[70vh] w-full bg-black"
            >
              <span className={cn("p-4 text-sm text-white", bn)}>
                {bn ? "ভিডিও চালানো যায়নি" : "Video cannot be played"}
              </span>
            </video>
          )}
        </div>
        <Caption text={block.caption} bn={bn} />
      </figure>
    );
  }

  // ---- UNKNOWN TYPE (defensive) ----------------------------------
  if (!block.value) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
      <LuPlay className="mt-0.5 shrink-0" />
      <span className="break-words">{block.value}</span>
    </div>
  );
}

export default ResourceBlock;
