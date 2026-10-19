import { formatArea, formatMoney, formatPhone } from "./format";
import { monthsLabel } from "./installments";
import type { PaymentStatus, Sale } from "./types";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Ожидается",
  paid: "Оплачено",
  overdue: "Просрочено",
};

export const longDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" });
export const numericDate = new Intl.DateTimeFormat("ru-RU");
export const day = (iso: string) => new Date(`${iso}T00:00:00`);

/** "Блок 1, Этаж 3, Хонаи 5" */
export function apartmentLabel(sale: Sale): string {
  if (sale.unit_name === null) return "Помещение удалено";
  return `Блок ${sale.block_letter}, Этаж ${sale.floor_number}, ${sale.unit_name}`;
}

/** The summary above the schedule — the same list as in the Excel / Word exports. */
export function scheduleSummary(sale: Sale): [string, string][] {
  const rest = sale.total_price === null ? null : sale.total_price - sale.down_payment;
  const rows: [string, string][] = [
    ["Покупатель", sale.buyer_name],
    ["Телефон", formatPhone(sale.buyer_phone)],
    ["Квартира", apartmentLabel(sale)],
    ["Площадь", sale.area ? formatArea(sale.area) : "—"],
    ["Дата продажи", longDate.format(day(sale.sale_date))],
    ["Общая стоимость", sale.total_price === null ? "—" : formatMoney(sale.total_price)],
    ["Первоначальный взнос", formatMoney(sale.down_payment)],
    ["Остаток", rest === null ? "—" : formatMoney(rest)],
  ];
  if (sale.payment_type === "installment") {
    if (sale.markup_percent) {
      rows.push(["Наценка за рассрочку", `${String(sale.markup_percent).replace(".", ",")}%`]);
      rows.push(["Сумма рассрочки с наценкой", formatMoney(sale.financed_amount)]);
    }
    rows.push(
      ["Срок рассрочки", sale.term_months ? monthsLabel(sale.term_months) : "—"],
      [
        "Ежемесячный платёж",
        sale.monthly_payment === null ? "—" : formatMoney(sale.monthly_payment),
      ],
      ["Остаток долга на сегодня", sale.remaining === null ? "—" : formatMoney(sale.remaining)],
    );
  } else {
    rows.push(["Способ оплаты", "Полная оплата"]);
  }
  return rows;
}
