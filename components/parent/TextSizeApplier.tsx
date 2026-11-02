"use client";

import { useEffect } from "react";
import { useCachedCircle } from "@/lib/parent/circle-cache";

// Applies the Extra Large text size chosen by the family while a parent screen is open.
export function TextSizeApplier() {
  const xl = useCachedCircle()?.textSize === "xl";
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("parent-text-xl", xl);
    return () => root.classList.remove("parent-text-xl");
  }, [xl]);
  return null;
}
