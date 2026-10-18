"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function ErrorState({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const t = useTranslations("common");
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-card border border-line bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-sand text-muted">
        <WifiOff className="size-6" aria-hidden />
      </span>
      <p className="mt-5 font-display text-lg font-bold">{t("errorTitle")}</p>
      <p className="mt-2 max-w-sm text-[15px] text-muted">{t("errorText")}</p>
      <Button variant="secondary" className="mt-6" onClick={onRetry}>
        <RefreshCw className="size-4" aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}
