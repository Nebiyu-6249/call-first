import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { textLink } from "./styles";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className={textLink}>
      <ArrowLeft aria-hidden="true" className="size-6" />
      {label}
    </Link>
  );
}
