"use client";

// Renders a QR code for a resource slug and offers PNG / SVG download + copy-link.
// The QR encodes `${origin}/r/${slug}` — the public resource page a scan opens.
import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { LuDownload, LuCopy, LuCheck, LuExternalLink } from "react-icons/lu";
import { cn } from "@/components/ui";
import { useIsoEffect } from "./hooks";

function getSvg(container: HTMLElement | null): SVGSVGElement | null {
  return container?.querySelector("svg") ?? null;
}

// Serialize the rendered SVG with explicit size + xmlns so it stands alone.
function serializeSvg(svg: SVGSVGElement, size: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  return new XMLSerializer().serializeToString(clone);
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function QrCard({
  slug,
  filenameBase = "qr",
  size = 148,
}: {
  slug?: string;
  filenameBase?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useIsoEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!slug) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        QR appears once the resource is saved.
      </div>
    );
  }

  const url = `${origin}/r/${slug}`;
  const safeName = (filenameBase || slug).replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  const downloadSvg = () => {
    const svg = getSvg(ref.current);
    if (!svg) return;
    const data = serializeSvg(svg, 512);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    triggerDownload(href, `${safeName}.svg`);
    URL.revokeObjectURL(href);
  };

  const downloadPng = () => {
    const svg = getSvg(ref.current);
    if (!svg) return;
    const out = 512;
    const data = serializeSvg(svg, out);
    const img = new Image();
    const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data)))}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out, out);
      ctx.drawImage(img, 0, 0, out, out);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const href = URL.createObjectURL(blob);
        triggerDownload(href, `${safeName}.png`);
        URL.revokeObjectURL(href);
      }, "image/png");
    };
    img.src = svgUrl;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={ref} className="rounded-xl border border-border bg-white p-3">
        <QRCode
          value={url}
          size={size}
          style={{ height: "auto", maxWidth: "100%", width: size }}
          bgColor="#ffffff"
          fgColor="#0e2a33"
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <QrButton onClick={downloadPng}>
          <LuDownload /> PNG
        </QrButton>
        <QrButton onClick={downloadSvg}>
          <LuDownload /> SVG
        </QrButton>
        <QrButton onClick={copyLink}>
          {copied ? <LuCheck className="text-accent" /> : <LuCopy />} {copied ? "Copied" : "Copy"}
        </QrButton>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
        >
          <LuExternalLink /> Open
        </a>
      </div>
      <p className="max-w-full truncate text-center text-[11px] text-muted-foreground" title={url}>
        /r/{slug}
      </p>
    </div>
  );
}

function QrButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
        "transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

export default QrCard;
