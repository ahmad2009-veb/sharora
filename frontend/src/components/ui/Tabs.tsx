"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TabItem<T extends string> = { value: T; label: ReactNode; disabled?: boolean };

type Props<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
};

/** Segmented control with roving focus (arrow keys) per WAI-ARIA tabs pattern. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  size = "md",
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    let next = index;
    do {
      next = (next + dir + items.length) % items.length;
    } while (items[next].disabled && next !== index);
    refs.current[next]?.focus();
    onChange(items[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex rounded-full bg-sand p-1", className)}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "rounded-full font-medium transition-colors disabled:opacity-40",
              size === "sm" ? "h-8 px-3.5 text-sm" : "h-10 px-5 text-[15px]",
              selected ? "bg-ink font-semibold text-gold shadow-soft" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
