import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
  as?: "h1" | "h2";
  id?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  tone = "light",
  align = "left",
  as: Tag = "h2",
  id,
  className,
}: Props) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p
          className={cn(
            "mb-5 flex items-center gap-3 eyebrow",
            align === "center" && "justify-center",
            dark ? "text-gold" : "text-gold-deep",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              dark ? "bg-gold shadow-[0_0_10px_#ffdea4]" : "bg-gold-deep",
            )}
          />
          {eyebrow}
        </p>
      )}
      <Tag
        id={id}
        className={cn(
          "font-display font-extrabold",
          Tag === "h1" ? "text-h1" : "text-h2",
          dark ? "text-white" : "text-ink",
        )}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className={cn("mt-5 max-w-2xl text-body md:text-lg", dark ? "text-mist" : "text-muted")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
