"use client";

import Clarity from "@microsoft/clarity";

export function initClarity() {
  if (typeof window !== "undefined") {
    Clarity.init(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID!);
  }
}
