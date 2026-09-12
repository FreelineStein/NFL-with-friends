"use client";

import { initials } from "@/lib/format";

interface ChipProps {
  name: string;
  color: string;
  /** solid = primary pick, outline = secondary (e.g. wildcard). */
  variant?: "solid" | "outline";
  /** Show the full name instead of initials. */
  full?: boolean;
  title?: string;
}

export default function Chip({ name, color, variant = "solid", full = false, title }: ChipProps) {
  const solid = variant === "solid";
  return (
    <span
      title={title ?? name}
      className={`inline-flex items-center justify-center rounded-full font-semibold leading-none select-none ${
        full ? "px-2 py-0.5 text-xs gap-1" : "h-5 min-w-5 px-1 text-[10px]"
      }`}
      style={{
        backgroundColor: solid ? color : `${color}22`,
        color: solid ? "#fff" : color,
        boxShadow: solid ? undefined : `inset 0 0 0 1px ${color}`,
      }}
    >
      {full ? name : initials(name)}
    </span>
  );
}
