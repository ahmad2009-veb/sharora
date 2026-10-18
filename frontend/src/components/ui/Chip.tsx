import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean };

/** Toggle chip for filters. */
export function Chip({ active = false, className, ...props }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
        active ? "bg-ink text-gold shadow-soft" : "bg-sand text-ink hover:bg-sand-deep",
        className,
      )}
      {...props}
    />
  );
}
