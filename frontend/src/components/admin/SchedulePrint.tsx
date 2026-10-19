"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { day, numericDate, PAYMENT_STATUS_LABELS, scheduleSummary } from "@/lib/schedule";

// A4, black and white; page numbers come from the @page margin box.
const PRINT_CSS = `
@page {
  size: A4;
  margin: 14mm 12mm 16mm;
  @bottom-center { content: "Страница " counter(page) " из " counter(pages); font: 9pt sans-serif; }
}
@media print {
  html, body { background: #fff !important; }
  body * { background: transparent !important; box-shadow: none !important; }
  .print-sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important;
    max-width: none !important; border-radius: 0 !important; }
  .print-sheet, .print-sheet * { color: #000 !important; background: transparent !important; }
  .print-sheet tr { break-inside: avoid; }
  .print-sheet thead { display: table-header-group; }
}
`;

/** Print-friendly «График платежей» (opened from the schedule modal in a new tab). */
export function SchedulePrint({ saleId }: { saleId: number }) {
  const autoPrint = useSearchParams().get("print") === "1";
  const schedule = useQuery({
    queryKey: ["admin", "schedule", saleId],
    queryFn: () => adminApi.schedule(saleId),
    retry: false,
  });
  const data = schedule.data;

  useEffect(() => {
    if (!data || !autoPrint) return;
    const t = window.setTimeout(() => window.print(), 300); // let fonts settle
    return () => window.clearTimeout(t);
  }, [data, autoPrint]);

  if (schedule.error) {
    const status = schedule.error instanceof ApiError ? schedule.error.status : 0;
    return (
      <p className="p-10 text-center text-muted">
        {status === 401
          ? "Войдите в админ-панель, чтобы распечатать график."
          : status === 404
            ? "Продажа не найдена."
            : "Не удалось загрузить график."}
      </p>
    );
  }

  const totalAmount = data?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalPaid = data?.payments.reduce((s, p) => s + p.paid_amount, 0) ?? 0;
  const summary = data ? scheduleSummary(data.sale) : [];
  const half = Math.ceil(summary.length / 2);

  return (
    <div className="px-4 py-6 print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" onClick={() => window.close()}>
          <ArrowLeft className="size-4" aria-hidden />
          Закрыть
        </Button>
        <Button onClick={() => window.print()} disabled={!data}>
          <Printer className="size-4" aria-hidden />
          Печать
        </Button>
      </div>

      <article className="print-sheet mx-auto max-w-[210mm] rounded-2xl bg-white p-[12mm] text-[10.5pt] leading-snug text-black shadow-soft">
        {!data ? (
          <Skeleton className="h-[200mm] w-full" />
        ) : (
          <>
            <header className="text-center">
              <p className="text-[13pt] font-bold tracking-wide">Zarafshon Sokhtmon</p>
              <h1 className="mt-1 text-[14pt] font-bold">График платежей по договору рассрочки</h1>
              <p className="mt-1 text-right text-[9.5pt]">Дата: {numericDate.format(new Date())}</p>
            </header>

            <div className="mt-4 grid grid-cols-2 gap-x-8">
              {[summary.slice(0, half), summary.slice(half)].map((col, i) => (
                <table key={i} className="w-full">
                  <tbody>
                    {col.map(([k, v]) => (
                      <tr key={k}>
                        <th scope="row" className="py-0.5 pr-3 text-left align-top font-semibold">
                          {k}
                        </th>
                        <td className="py-0.5 align-top tabular-nums">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>

            {data.payments.length === 0 ? (
              <p className="mt-6">Квартира оплачена полностью — графика платежей нет.</p>
            ) : (
              <table className="mt-5 w-full border-collapse text-[9.5pt] tabular-nums [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1">
                <thead>
                  <tr className="bg-[#eee]">
                    <th scope="col">№</th>
                    <th scope="col">Дата платежа</th>
                    <th scope="col">Сумма платежа</th>
                    <th scope="col">Оплачено</th>
                    <th scope="col">Остаток долга после платежа</th>
                    <th scope="col">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-center">{p.number}</td>
                      <td className="text-center">{numericDate.format(day(p.due_date))}</td>
                      <td className="text-right">{formatMoney(p.amount)}</td>
                      <td className="text-right">
                        {p.paid_amount ? formatMoney(p.paid_amount) : "—"}
                      </td>
                      <td className="text-right">{formatMoney(p.balance_after)}</td>
                      <td
                        className={p.status === "overdue" ? "text-center font-bold" : "text-center"}
                      >
                        {PAYMENT_STATUS_LABELS[p.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={2} className="text-left">
                      Итого
                    </td>
                    <td className="text-right">{formatMoney(totalAmount)}</td>
                    <td className="text-right">{formatMoney(totalPaid)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}

            <div className="mt-14 grid break-inside-avoid grid-cols-2 gap-10">
              <div>
                <p>Продавец ______________</p>
                <p className="mt-1 text-[9pt]">Zarafshon Sokhtmon</p>
              </div>
              <div>
                <p>Покупатель ______________</p>
                <p className="mt-1 text-[9pt]">{data.sale.buyer_name}</p>
              </div>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
