"use client";

import { AnimatePresence, m, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
 * Transparent over the home hero, turning into navy glass with a thin gold hairline once the
 * page scrolls. On inner pages (`overlay={false}`) it is glass from the start.
 * 72px tall on phones/tablets, 80px on desktop.
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const locale = useLocale() as Locale;
  const tc = useTranslations("common");
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
            ? "bg-ink/80 shadow-[0_8px_32px_rgb(0_0_0/0.35)] backdrop-blur-md backdrop-saturate-150"
            : "bg-gradient-to-b from-night/70 to-transparent",
        )}
      >
        {/* Gold hairline under the glass, fades in once the page has scrolled. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_222_164/0.7)_30%,rgb(255_222_164/0.7)_70%,transparent)] transition-opacity duration-500",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="container-page flex h-[72px] items-center gap-4 lg:h-20">
          <Logo size="lg" className="shrink-0" />

          {/* The items at 16px only fit from the `nav` breakpoint (1400px); below it, the burger. */}
          <nav aria-label={tc("mainNav")} className="ml-auto hidden nav:block">
            <ul className="flex items-center gap-1">
              {/* The logo already links home, so the desktop bar skips «Главная». */}
              {site.nav
                .filter((item) => item.href !== "/")
                .map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative block px-2.5 py-2.5 text-base font-medium whitespace-nowrap transition-colors duration-300",
                          active ? "text-gold" : "text-white/80 hover:text-gold",
                        )}
                      >
                        {tr(item.label, locale)}
                        {/* Hover: underline grows from the centre. Active: a gold bar that glides between items. */}
                        <span
                          aria-hidden
                          className="absolute inset-x-2.5 bottom-1 h-px origin-center scale-x-0 bg-gold/60 transition-transform duration-300 ease-out-soft group-hover:scale-x-100"
                        />
                        {active && (
                          <m.span
                            layoutId="nav-underline"
                            aria-hidden
                            className="absolute inset-x-2.5 bottom-0.5 h-[2px] rounded-full bg-gold shadow-[0_0_10px_rgb(255_222_164/0.8)]"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3 nav:ml-4">
            <a
              href={site.contact.phoneHref}
              aria-label={`${tr(site.actions.call, locale)}: ${site.contact.phoneDisplay}`}
              className="grid size-10 place-items-center rounded-full text-gold ring-1 ring-white/10 transition-colors hover:bg-white/10"
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
                "h-12 px-7 text-sm tracking-wider uppercase ring-1 ring-gold-soft/60 hover:-translate-y-px hover:shadow-[0_0_44px_rgb(255_222_164/0.6)] max-md:hidden",
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
              className="hidden size-10 place-items-center rounded-full text-white transition-colors hover:bg-white/10 lg:grid nav:hidden"
            >
              <Menu className="size-6" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <m.div
            ref={menuRef}
            id="mobile-menu"
            data-dialog
            role="dialog"
            aria-modal="true"
            aria-label={tr(site.actions.menu, locale)}
            tabIndex={-1}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink text-white outline-none nav:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div aria-hidden className="atmosphere" />
            <div className="relative container-page flex h-[72px] items-center justify-between lg:h-20">
              <Logo size="lg" />
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
              aria-label={tc("mobileNav")}
              className="relative container-page flex-1 overflow-y-auto py-6"
            >
              <ul className="space-y-1">
                {site.nav.map((item, i) => (
                  <m.li
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
                  </m.li>
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
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
