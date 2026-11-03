"use client";

import { useEffect } from "react";

// Registers the service worker that keeps the parent's main screens working offline (public/sw.js).
// Production only: in development the files change on every edit.
export function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a bonus; the app works without it.
    });
  }, []);
  return null;
}
