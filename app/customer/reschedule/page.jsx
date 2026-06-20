"use client";

import { Suspense } from "react";
import RescheduleInner from "./reschedule-inner";

export default function ReschedulePage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <RescheduleInner />
    </Suspense>
  );
}
