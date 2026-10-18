const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const areaFormat = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export const formatNumber = (value: number) => numberFormat.format(value);
export const formatArea = (value: number) => `${areaFormat.format(value)} м²`;
export const formatMoney = (value: number) => `${numberFormat.format(Math.round(value))} смн`;

/** "+992931234567" → "+992 93 123 4567" */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const m = digits.match(/^992(\d{2})(\d{3})(\d{4})$/);
  return m ? `+992 ${m[1]} ${m[2]} ${m[3]}` : value;
}

/** Keeps the "+992 " prefix and formats the rest as the user types. */
export function maskTjPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("992")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean);
  return `+992 ${parts.join(" ")}`.trimEnd();
}

export const isValidTjPhone = (value: string) => /^\+992\d{9}$/.test(value.replace(/\s/g, ""));
