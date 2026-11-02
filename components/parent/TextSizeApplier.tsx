"use client";

import { useEffect } from "react";
import { readTextSize } from "@/lib/parent/settings";

// Applies the Extra Large text size chosen by the family while a parent screen is open.
export function TextSizeApplier() {
  useEffect(() => {
    const root = document.documentElement;
    if (readTextSize() === "xl") root.classList.add("parent-text-xl");
    return () => root.classList.remove("parent-text-xl");
  }, []);
  return null;
}
