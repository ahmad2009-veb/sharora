// Phones (< md): 48px fields with 16px text so iOS Safari does not zoom on focus.
export const inputClass =
  "h-11 w-full rounded-xl bg-sand px-3.5 text-[15px] ring-1 ring-transparent transition-[box-shadow,background-color] hover:ring-line focus:bg-white focus:ring-2 focus:ring-gold-soft focus:outline-none disabled:opacity-60 max-md:h-12 max-md:text-base";

export const labelClass =
  "mb-1.5 block text-[11px] font-bold tracking-[0.14em] text-muted uppercase max-md:text-sm max-md:font-semibold max-md:tracking-normal max-md:normal-case";

export const STATUS_LABELS = { free: "Свободно", reserved: "Бронь", sold: "Продано" } as const;

/**
 * The action row at the end of a form inside a `sheet` Modal: on phones it sticks to the
 * bottom of the sheet with full-width buttons. Offsets match the Modal body padding.
 */
export const sheetActionsBase =
  "max-md:sticky max-md:mt-auto max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:-mb-5 max-md:grid max-md:gap-2 max-md:border-t max-md:border-line max-md:bg-white/95 max-md:px-4 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:backdrop-blur-md max-md:[&>*]:h-12";

/** Cancel (auto width) + primary action (fills the rest). */
export const sheetActionsClass = `${sheetActionsBase} max-md:grid-cols-[auto_1fr]`;

/** Root of the content inside a `sheet` Modal, so the action row can sit at the bottom. */
export const sheetContentClass = "max-md:flex max-md:flex-1 max-md:flex-col";

/** Horizontal chip row on phones (scrolls sideways instead of wrapping); add -mx-4 to bleed. */
export const chipRowClass =
  "flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const chipClass = (active: boolean) =>
  `flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold whitespace-nowrap transition-colors ${
    active ? "bg-ink text-gold" : "bg-white text-ink shadow-soft ring-1 ring-ink/5"
  }`;
