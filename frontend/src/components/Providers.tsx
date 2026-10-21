"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

import { PageTransitionProvider } from "@/components/motion/PageTransition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ToastProvider } from "@/components/ui/Toast";
import { QueryProvider } from "@/lib/query-provider";

// Components use the light `m.*` elements; the engine arrives in its own chunk.
const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user" disables transform animations for prefers-reduced-motion.
    <LazyMotion features={loadMotionFeatures} strict>
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
    </LazyMotion>
  );
}
