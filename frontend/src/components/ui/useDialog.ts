"use client";

import { useEffect, useRef, type RefObject } from "react";

import { lockScroll, unlockScroll } from "@/lib/smooth-scroll";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour shared by Modal and Lightbox: Escape to close, focus trap,
 * body scroll lock and focus restoration to the trigger on close.
 */
export function useDialog(open: boolean, onClose: () => void): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    lockScroll();
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const frame = requestAnimationFrame(() => {
      const node = ref.current;
      const target = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node;
      target?.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      const node = ref.current;
      if (!node) return;
      // Only the top-most open dialog reacts.
      const dialogs = document.querySelectorAll("[data-dialog]");
      if (dialogs[dialogs.length - 1] !== node) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      unlockScroll();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
