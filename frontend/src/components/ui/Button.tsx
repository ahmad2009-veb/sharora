import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

// `btn` lets globals.css wrap long Tajik labels on phones.
const base =
  "btn inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out-soft active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "btn-shine bg-gold font-bold text-on-gold shadow-[0_0_24px_rgb(255_222_164/0.28)] hover:bg-gold-soft hover:shadow-[0_0_36px_rgb(255_222_164/0.45)]",
  secondary: "bg-white text-ink shadow-soft ring-1 ring-ink/8 hover:ring-ink/25 hover:shadow-lift",
  ghost: "text-ink hover:bg-ink/5",
  inverse:
    "bg-white/8 text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-white hover:text-ink hover:ring-white",
  dark: "bg-ink text-white hover:bg-navy hover:shadow-lift",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-8 text-[15px] tracking-wide",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  );
});
