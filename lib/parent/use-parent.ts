// What every parent screen needs: the cached circle and, when paired, the way to reach the family.

import { useMemo } from "react";
import type { FamilyChannel } from "@/lib/circle/channel";
import type { DeviceCircle } from "@/lib/circle/types";
import { useCachedCircle } from "./circle-cache";
import { deviceChannel } from "./device";

export function useParent(): { circle: DeviceCircle | null; channel: FamilyChannel | null } {
  const circle = useCachedCircle();
  const familyName = circle?.familyMembers[0]?.name ?? null;
  const channel = useMemo(() => (familyName ? deviceChannel(familyName) : null), [familyName]);
  return { circle, channel };
}
