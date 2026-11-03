// What every parent screen needs: the cached circle and, when paired, the way to reach the family.
// Inside the demo, both come from the demo instead.

import { useMemo } from "react";
import type { FamilyChannel } from "@/lib/circle/channel";
import type { DeviceCircle } from "@/lib/circle/types";
import { useCachedCircle } from "./circle-cache";
import { deviceChannel } from "./device";
import { useParentEnv } from "./env";

export function useParent(): { circle: DeviceCircle | null; channel: FamilyChannel | null } {
  const env = useParentEnv();
  const cached = useCachedCircle();
  const familyName = env ? null : (cached?.familyMembers[0]?.name ?? null);
  const channel = useMemo(() => (familyName ? deviceChannel(familyName) : null), [familyName]);
  if (env) return { circle: env.circle, channel: env.channel };
  return { circle: cached, channel };
}
