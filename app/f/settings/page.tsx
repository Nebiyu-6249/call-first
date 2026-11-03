import type { Metadata } from "next";
import { FamilySettings } from "@/components/family/FamilySettings";

export const metadata: Metadata = { title: "Contacts and settings" };

export default function FamilySettingsPage() {
  return <FamilySettings />;
}
