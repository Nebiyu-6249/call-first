"use client";

// Links, call buttons and screen wrappers that work both as real pages and inside the demo frame.

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { telHref } from "@/lib/next-step";
import { PARENT_ROUTES, useParentEnv, type ParentRoute } from "@/lib/parent/env";

export function ParentLink({ to, className, children }: { to: ParentRoute; className?: string; children: ReactNode }) {
  const env = useParentEnv();
  if (env) {
    return (
      <button type="button" onClick={() => env.go(to)} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link href={PARENT_ROUTES[to]} className={className}>
      {children}
    </Link>
  );
}

// Always a real tel: link to a saved number. In the demo it explains the call instead of dialling.
export function CallLink({
  name,
  phone,
  className,
  children,
}: {
  name: string;
  phone: string;
  className?: string;
  children: ReactNode;
}) {
  const env = useParentEnv();
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!env) return;
    event.preventDefault();
    env.call(name, phone);
  }
  return (
    <a href={telHref(phone)} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

// The page's main landmark, or a plain block inside the demo, where the demo page has its own.
export function Screen({ className, children }: { className?: string; children: ReactNode }) {
  const Tag = useParentEnv() ? "div" : "main";
  return <Tag className={className}>{children}</Tag>;
}
