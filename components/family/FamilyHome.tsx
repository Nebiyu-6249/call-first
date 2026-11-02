"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, LogOut, Settings } from "lucide-react";
import type { AlertView } from "@/lib/circle/alerts";
import { familyApi, formatFamilyCode, type DeviceInfo, type FamilyCircle } from "@/lib/family/api";
import { AlertCard } from "./AlertCard";
import { PairPhone } from "./PairPhone";
import { fButtonSecondary } from "./ui";

const INBOX_REFRESH_MS = 10000;

export function FamilyHome() {
  const router = useRouter();
  const [circle, setCircle] = useState<FamilyCircle | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [alerts, setAlerts] = useState<AlertView[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    familyApi.circle().then((res) => {
      if (!active) return;
      if (!res.ok && res.status === 401) return router.replace("/f/signin");
      if (!res.ok) return setError(res.error);
      setCircle(res.data.circle);
      setDevices(res.data.devices);
    });
    const loadAlerts = () =>
      familyApi.alerts().then((res) => {
        if (active && res.ok) setAlerts(res.data.alerts);
      });
    void loadAlerts();
    const timer = window.setInterval(loadAlerts, INBOX_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [router]);

  async function signOut() {
    await familyApi.signOut();
    router.push("/f");
  }

  if (error) return <p role="alert" className="font-bold text-warning">{error}</p>;
  if (!circle) return <p role="status">Loading...</p>;

  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Looking after {circle.parentName}</h1>
        <p className="text-muted">
          Family code <span className="font-mono font-bold">{formatFamilyCode(circle.familyCode)}</span>
        </p>
        <nav aria-label="Family" className="flex flex-wrap gap-3">
          <Link href="/f/settings" className={fButtonSecondary}>
            <Settings aria-hidden="true" className="size-5" />
            Contacts and settings
          </Link>
          <button type="button" onClick={signOut} className={fButtonSecondary}>
            <LogOut aria-hidden="true" className="size-5" />
            Sign out
          </button>
        </nav>
      </header>

      <section aria-labelledby="inbox-heading" className="flex flex-col gap-4">
        <h2 id="inbox-heading" className="flex items-center gap-2 text-2xl font-bold">
          <Inbox aria-hidden="true" className="size-7 text-primary" />
          Messages from {circle.parentName}
        </h2>
        {alerts === null ? (
          <p role="status">Loading...</p>
        ) : alerts.length === 0 ? (
          <p>Nothing yet. When {circle.parentName} taps &ldquo;Show {circle.familyMembers[0]?.name ?? "family"}&rdquo;, it appears here. Messages are deleted after 7 days.</p>
        ) : (
          <div aria-live="polite" className="flex flex-col gap-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                parentName={circle.parentName}
                onReply={async (kind, text) => {
                  const res = await familyApi.reply(alert.id, kind, text);
                  if (!res.ok) return res.error;
                  const fresh = await familyApi.alerts();
                  if (fresh.ok) setAlerts(fresh.data.alerts);
                  return null;
                }}
              />
            ))}
          </div>
        )}
      </section>

      <PairPhone parentName={circle.parentName} connectedPhones={devices.length} />
    </main>
  );
}
