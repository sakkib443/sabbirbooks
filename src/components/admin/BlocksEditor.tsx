"use client";

// Repeatable content-block editor for QR resources. Each block is text / image /
// video: text uses a textarea; image + video use a URL input. All support an
// optional caption. Blocks can be reordered up/down and removed.
import { LuPlus, LuTrash2, LuArrowUp, LuArrowDown, LuType, LuImage, LuVideo } from "react-icons/lu";
import { Input, cn } from "@/components/ui";
import { Select, Textarea } from "./FormControls";
import type { QrBlock, QrBlockType } from "./types";

const TYPE_META: Record<QrBlockType, { icon: React.ReactNode; label: string; placeholder: string }> = {
  text: { icon: <LuType />, label: "Text", placeholder: "Write the explanation / answer…" },
  image: { icon: <LuImage />, label: "Image", placeholder: "https://…/image.jpg" },
  video: { icon: <LuVideo />, label: "Video", placeholder: "https://…/video or embed URL" },
};

export function BlocksEditor({
  blocks,
  onChange,
}: {
  blocks: QrBlock[];
  onChange: (next: QrBlock[]) => void;
}) {
  const update = (i: number, patch: Partial<QrBlock>) =>
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(blocks.filter((_, idx) => idx !== i));
  const add = (type: QrBlockType) => onChange([...blocks, { type, value: "", caption: "" }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No content blocks yet. Add a text, image, or video block below.
        </p>
      )}

      {blocks.map((block, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface-soft/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {TYPE_META[block.type].icon}
              </span>
              <Select
                value={block.type}
                onChange={(e) => update(i, { type: e.target.value as QrBlockType })}
                className="h-8 w-32 rounded-lg text-xs"
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn onClick={() => move(i, -1)} disabled={i === 0} label="Move up">
                <LuArrowUp />
              </IconBtn>
              <IconBtn onClick={() => move(i, 1)} disabled={i === blocks.length - 1} label="Move down">
                <LuArrowDown />
              </IconBtn>
              <IconBtn onClick={() => remove(i)} label="Remove" danger>
                <LuTrash2 />
              </IconBtn>
            </div>
          </div>

          {block.type === "text" ? (
            <Textarea
              value={block.value}
              rows={3}
              placeholder={TYPE_META.text.placeholder}
              onChange={(e) => update(i, { value: e.target.value })}
            />
          ) : (
            <Input
              value={block.value}
              placeholder={TYPE_META[block.type].placeholder}
              onChange={(e) => update(i, { value: e.target.value })}
            />
          )}

          <Input
            value={block.caption ?? ""}
            placeholder="Caption (optional)"
            className="mt-2 h-9 text-xs"
            onChange={(e) => update(i, { caption: e.target.value })}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_META) as QrBlockType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => add(t)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
          >
            <LuPlus /> {TYPE_META[t].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "rounded-lg border border-border p-1.5 text-muted-foreground transition-colors",
        "disabled:opacity-40 disabled:pointer-events-none",
        danger ? "hover:border-coral/40 hover:bg-coral/10 hover:text-coral" : "hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
