import { Suspense } from "react";

import { SchedulePrint } from "@/components/admin/SchedulePrint";

export default async function SchedulePrintPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  return (
    <Suspense>
      <SchedulePrint saleId={Number(saleId)} />
    </Suspense>
  );
}
