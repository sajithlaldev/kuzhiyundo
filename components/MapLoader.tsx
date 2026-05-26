"use client";

import dynamic from "next/dynamic";
import type { SerializedReport } from "@/lib/firebase-server";

const LeafletPotholeMap = dynamic(() => import("./LeafletPotholeMap"), {
  ssr: false,
});

export default function MapLoader({ initialReports }: { initialReports?: SerializedReport[] }) {
  return <LeafletPotholeMap initialReports={initialReports} />;
}
