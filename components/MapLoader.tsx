"use client";

import dynamic from "next/dynamic";

const LeafletPotholeMap = dynamic(() => import("./LeafletPotholeMap"), {
  ssr: false,
});

export default function MapLoader() {
  return <LeafletPotholeMap />;
}
