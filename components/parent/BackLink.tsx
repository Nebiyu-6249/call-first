import { ArrowLeft } from "lucide-react";
import type { ParentRoute } from "@/lib/parent/env";
import { ParentLink } from "./nav";
import { textLink } from "./styles";

export function BackLink({ to, label = "Back" }: { to: ParentRoute; label?: string }) {
  return (
    <ParentLink to={to} className={`${textLink} self-start`}>
      <ArrowLeft aria-hidden="true" className="size-6" />
      {label}
    </ParentLink>
  );
}
