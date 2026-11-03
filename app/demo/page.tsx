import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/DemoApp";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Demo",
  description: `Try ${APP_NAME} with a made-up family: check sample scam messages and see the family loop.`,
};

export default function DemoPage() {
  return <DemoApp />;
}
