/* eslint-disable @next/next/no-img-element */
import { cn } from "@/components/ui";

// Subject-themed cover styling (emoji + gradient) so demo books look like real
// textbook covers instead of a grey "400x600" placeholder. Matched by keyword
// against the book's category/title.
const SUBJECTS: Record<string, { emoji: string; from: string; to: string }> = {
  anatomy: { emoji: "🫀", from: "#fb7185", to: "#9f1239" },
  physiology: { emoji: "🫁", from: "#60a5fa", to: "#1e3a8a" },
  biochem: { emoji: "🧬", from: "#fbbf24", to: "#92400e" },
  pharma: { emoji: "💊", from: "#c084fc", to: "#5b21b6" },
  pathology: { emoji: "🔬", from: "#34d399", to: "#065f46" },
  microbio: { emoji: "🦠", from: "#2dd4bf", to: "#115e59" },
  immun: { emoji: "🦠", from: "#2dd4bf", to: "#115e59" },
  community: { emoji: "🏥", from: "#38bdf8", to: "#164e63" },
  forensic: { emoji: "⚖️", from: "#94a3b8", to: "#1e293b" },
  surgery: { emoji: "🩺", from: "#f472b6", to: "#831843" },
  medicine: { emoji: "⚕️", from: "#5eead4", to: "#0f766e" },
};
const DEFAULT = { emoji: "📘", from: "#2dd4bf", to: "#0E7C7B" };

function themeFor(category?: string, title?: string) {
  const hay = `${category || ""} ${title || ""}`.toLowerCase();
  for (const key of Object.keys(SUBJECTS)) if (hay.includes(key)) return SUBJECTS[key];
  return DEFAULT;
}

// A "real" cover = an uploaded image, not a placeholder/demo URL.
function isRealCover(url?: string) {
  return (
    !!url &&
    !/placehold\.co|placeholder|via\.placeholder|example\.com|\b\d{3,4}x\d{3,4}\b/i.test(url)
  );
}

export default function BookCover({
  title,
  author,
  category,
  coverImage,
  className,
}: {
  title: string;
  author?: string;
  category?: string;
  coverImage?: string;
  className?: string;
}) {
  if (isRealCover(coverImage)) {
    return (
      <img
        src={coverImage}
        alt={title}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const s = themeFor(category, title);
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-white",
        className
      )}
      style={{ background: `linear-gradient(150deg, ${s.from} 0%, ${s.to} 100%)` }}
    >
      {/* book spine */}
      <span className="absolute inset-y-0 left-0 w-2 bg-black/25" />
      <span className="absolute inset-y-0 left-2 w-px bg-white/30" />
      {/* dotted texture */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 20%, #fff 1px, transparent 1.6px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* header imprint */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/85">
          Sabbir&nbsp;Book
        </span>
        {category && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {category}
          </span>
        )}
      </div>

      {/* subject emoji medallion */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-white/15 text-[2.75rem] leading-none shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
          {s.emoji}
        </span>
      </div>

      {/* title + author */}
      <div className="relative z-10">
        <div className="mb-2 h-0.5 w-9 rounded-full bg-white/50" />
        <h4 className="line-clamp-3 font-heading text-[15px] font-bold leading-tight drop-shadow-sm">
          {title}
        </h4>
        {author && <p className="mt-1 line-clamp-1 text-[11px] text-white/85">{author}</p>}
      </div>
    </div>
  );
}
