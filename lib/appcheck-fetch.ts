"use client";

import { getToken } from "firebase/app-check";
import { appCheck } from "./firebase";

export async function fetchWithAppCheck(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (appCheck) {
    try {
      const { token } = await getToken(appCheck);
      headers.set("X-Firebase-AppCheck", token);
    } catch {
      // proceed without token — server will reject if enforcement is on
    }
  }

  return fetch(input, { ...init, headers });
}
