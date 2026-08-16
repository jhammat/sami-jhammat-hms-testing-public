"use client";

import {
  installClientStorageGuard,
} from "@/lib/dev/client-storage-guard";

if (
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined"
) {
  installClientStorageGuard();
}

export function ClientStorageGuard(): null {
  return null;
}
