"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

import { PageTransitionProvider } from "@/components/motion/PageTransition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ToastProvider } from "@/components/ui/Toast";
import { QueryProvider } from "@/lib/query-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user" disables transform animations for prefers-reduced-motion.
    <MotionConfig reducedMotion="user">
      <QueryProvider>
        <ToastProvider>
          <PageTransitionProvider>
            <SmoothScroll />
            {children}
          </PageTransitionProvider>
        </ToastProvider>
      </QueryProvider>
    </MotionConfig>
  );
}
