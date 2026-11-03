import type { Metadata } from "next";
import { SignIn } from "@/components/family/SignIn";

export const metadata: Metadata = { title: "Family sign-in" };

export default function SignInPage() {
  return <SignIn />;
}
