"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { useDialog } from "@/components/ui/useDialog";
import { site, tr } from "@/content/site";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";

/**
 * Transparent over the home hero, turning ink once the page scrolls.
 * On inner pages (`overlay={false}`) it is ink from the start.
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDialog(menuOpen, () => setMenuOpen(false));

  // Hide while scrolling down, come back (as glass) as soon as the user scrolls up.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    if (Math.abs(y - prev) > 4) setHidden(y > prev && y > 320);
  });
  useEffect(() => setMenuOpen(false), [pathname]);

  // Scroll-spy for the home page: highlights the section currently in view.
  const [section, setSection] = useState<string | null>(null);
  useEffect(() => {
    if (pathname !== "/") return;
    const ids = site.nav.map((n) => n.href.split("#")[1]).filter(Boolean) as string[];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSection(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const onTop = () => window.scrollY < 200 && setSection(null);
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/apartments") return pathname.startsWith("/apartments");
    if (href === "/") return pathname === "/" && section === null;
    const id = href.split("#")[1];
    return pathname === "/" && !!id && id === section;
  };

  const solid = !overlay || scrolled;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter,translate] duration-500 ease-out-soft",
          hidden && !menuOpen && "-translate-y-full",
          solid
            ? "bg-ink/85 shadow-[0_4px_30px_rgb(0_0_0/0.3)] backdrop-blur-xl backdrop-saturate-150"
            : "bg-gradient-to-b from-night/60 to-transparent",
        )}
      >
        <div className="container-page flex h-20 items-center gap-6">
          <Logo />

          <nav aria-label="Основная навигация" className="ml-auto hidden xl:block">
            <ul className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
              {site.nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href} className="relative">
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-night ring-1 ring-gold/25"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative block rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-wide whitespace-nowrap transition-colors",
                        active ? "text-gold" : "text-mist hover:text-gold",
                      )}
                    >
                      {tr(item.label, locale)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3 xl:ml-4">
            <a
              href={site.contact.phoneHref}
              className="hidden flex-col items-end leading-tight whitespace-nowrap 2xl:flex"
            >
              <span className="text-[10px] font-bold tracking-[0.18em] text-mist uppercase">
                {tr(site.contact.salesLabel, locale)}
              </span>
              <span className="text-[15px] font-semibold text-gold transition-colors hover:text-white">
                {site.contact.phoneDisplay}
              </span>
            </a>
            <a
              href={site.contact.phoneHref}
              aria-label={`${tr(site.actions.call, locale)}: ${site.contact.phoneDisplay}`}
              className="grid size-10 place-items-center rounded-full text-gold ring-1 ring-white/10 transition-colors hover:bg-white/10 2xl:hidden"
            >
              <Phone className="size-[18px]" aria-hidden />
            </a>
            <LocaleSwitcher className="max-sm:hidden" />
            <Link
              href="/apartments"
              data-magnetic
              className={buttonClasses(
                "primary",
                "md",
                "text-[13px] tracking-wider uppercase max-md:hidden",
              )}
            >
              {tr(site.actions.chooseApartment, locale)}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={tr(site.actions.menu, locale)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="hidden size-10 place-items-center rounded-full text-white transition-colors hover:bg-white/10 lg:grid xl:hidden"
            >
              <Menu className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            data-dialog
            role="dialog"
            aria-modal="true"
            aria-label={tr(site.actions.menu, locale)}
            tabIndex={-1}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink text-white outline-none xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div aria-hidden className="atmosphere" />
            <div className="relative container-page flex h-20 items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={tr(site.actions.close, locale)}
                data-autofocus
                className="grid size-10 place-items-center rounded-full hover:bg-white/10"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <nav
              data-lenis-prevent
              aria-label="Мобильная навигация"
              className="relative container-page flex-1 overflow-y-auto py-6"
            >
              <ul className="space-y-1">
                {site.nav.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-baseline gap-4 border-b border-white/10 py-4 font-display text-3xl font-extrabold tracking-tight",
                        "highlight" in item && item.highlight ? "text-gold" : "text-white",
                      )}
                    >
                      <span className="text-xs font-bold tracking-widest text-mist tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {tr(item.label, locale)}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="relative container-page space-y-5 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <a
                  href={site.contact.phoneHref}
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Phone className="size-5 text-gold" aria-hidden />
                  {site.contact.phoneDisplay}
                </a>
                <LocaleSwitcher />
              </div>
              <Link
                href="/apartments"
                onClick={() => setMenuOpen(false)}
                className={buttonClasses("primary", "lg", "w-full tracking-wider uppercase")}
              >
                {tr(site.actions.chooseApartment, locale)}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
