"use client";

import { useLayoutEffect } from "react";
import { useCachedCircle } from "@/lib/parent/circle-cache";

// Sets the parent screens' large text while one is showing: Large (22px) always, Extra Large (28px)
// when the family chose it. Removed again when the parent screens are left (Next.js keeps visited
// pages mounted but hidden, and hides them by running this cleanup), so other pages keep the normal size.
export function TextSizeApplier() {
  const xl = useCachedCircle()?.textSize === "xl";
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("parent-text");
    root.classList.toggle("parent-text-xl", xl);
    return () => root.classList.remove("parent-text", "parent-text-xl");
  }, [xl]);
  return null;
}
