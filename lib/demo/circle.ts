// The demo's fictional family. All names, the bank and the numbers are made up.
// 07700 900xxx and 0808 157 0xxx are UK ranges set aside for drama and fiction.

import type { DeviceCircle } from "@/lib/circle/types";

export const DEMO_CIRCLE: DeviceCircle = {
  parentName: "Amina",
  emergencyNumber: "999",
  textSize: "large",
  familyMembers: [
    { id: "f1", name: "Sara", relationship: "daughter", phone: "07700 900001" },
    { id: "f2", name: "Omar", relationship: "son", phone: "07700 900002" },
  ],
  contacts: [
    {
      id: "c1",
      label: "Gulf Example Bank",
      category: "bank",
      phone: "0808 157 0000",
      note: "The number on the back of Amina's bank card.",
    },
  ],
};
