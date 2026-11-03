"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, Trash2, Unplug } from "lucide-react";
import type { CircleSettingsInput } from "@/lib/circle/validate";
import { familyApi, type DeviceInfo, type FamilyCircle } from "@/lib/family/api";
import { CircleForm } from "./CircleForm";
import { fButtonSecondary, fCard, fInput, fLabel } from "./ui";

function toSettings(c: FamilyCircle): CircleSettingsInput {
  return {
    parentName: c.parentName,
    textSize: c.textSize,
    emergencyNumber: c.emergencyNumber,
    familyMembers: c.familyMembers.map(({ name, relationship, phone }) => ({ name, relationship, phone })),
    contacts: c.contacts.map(({ label, category, phone, note }) => ({ label, category, phone, note: note ?? "" })),
  };
}

function DeviceRow({ device, index, onRemoved }: { device: DeviceInfo; index: number; onRemoved: () => void }) {
  const [asking, setAsking] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function remove(event: FormEvent) {
    event.preventDefault();
    const res = await familyApi.removeDevice(device.id, pin);
    setPin("");
    if (!res.ok) return setError(res.error);
    onRemoved();
  }

  return (
    <li className="flex flex-col gap-2 border-t-2 border-border pt-3">
      <p>
        Phone {index + 1}: connected {new Date(device.createdAt).toLocaleDateString()}, last used{" "}
        {new Date(device.lastSeenAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </p>
      {asking ? (
        <form onSubmit={remove} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className={fLabel}>
            Your PIN
            <input className={fInput} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          </label>
          <button type="submit" className={fButtonSecondary} disabled={pin.length !== 6}>
            Disconnect
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className={`${fButtonSecondary} self-start`}>
          <Unplug aria-hidden="true" className="size-5" />
          Disconnect this phone
        </button>
      )}
      {error && (
        <p role="alert" className="font-bold text-warning">
          {error}
        </p>
      )}
    </li>
  );
}

export function FamilySettings() {
  const router = useRouter();
  const [circle, setCircle] = useState<FamilyCircle | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function load() {
    return familyApi.circle().then((res) => {
      if (!res.ok && res.status === 401) return router.replace("/f/signin");
      if (!res.ok) return setError(res.error);
      setCircle(res.data.circle);
      setDevices(res.data.devices);
    });
  }

  useEffect(() => {
    let active = true;
    familyApi.circle().then((res) => {
      if (!active) return;
      if (!res.ok && res.status === 401) return router.replace("/f/signin");
      if (!res.ok) return setError(res.error);
      setCircle(res.data.circle);
      setDevices(res.data.devices);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (error) return <p role="alert" className="font-bold text-warning">{error}</p>;
  if (!circle) return <p role="status">Loading...</p>;

  return (
    <main className="flex flex-col gap-6">
      <Link href="/f/home" className="inline-flex min-h-12 items-center gap-2 self-start text-lg font-bold text-primary underline underline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-6" />
        Back to messages
      </Link>
      <h1 className="text-3xl font-bold">Contacts and settings</h1>
      <p>Changes need your PIN every time. {circle.parentName}&apos;s phone picks them up the next time it opens the app.</p>

      {saved && (
        <p role="status" className="flex items-center gap-2 font-bold text-ok">
          <CircleCheck aria-hidden="true" className="size-6" />
          Saved.
        </p>
      )}

      <CircleForm
        mode="edit"
        initial={toSettings(circle)}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          setSaved(false);
          const res = await familyApi.update(values);
          if (!res.ok) return res.error;
          setSaved(true);
          window.scrollTo({ top: 0 });
          return null;
        }}
      />

      <section aria-labelledby="phones" className={`${fCard} flex flex-col gap-3`}>
        <h2 id="phones" className="text-2xl font-bold">
          Connected phones
        </h2>
        {devices.length === 0 ? (
          <p>No phones are connected.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {devices.map((d, i) => (
              <DeviceRow key={d.id} device={d} index={i} onRemoved={() => void load()} />
            ))}
          </ul>
        )}
      </section>

      <DeleteCircle parentName={circle.parentName} onDeleted={() => router.replace("/f/deleted")} />
    </main>
  );
}

function DeleteCircle({ parentName, onDeleted }: { parentName: string; onDeleted: () => void }) {
  const [pin, setPin] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await familyApi.deleteCircle(pin);
    setBusy(false);
    setPin("");
    if (!res.ok) return setError(res.error);
    onDeleted();
  }

  return (
    <section aria-labelledby="delete-circle" className={`${fCard} flex flex-col gap-3`}>
      <h2 id="delete-circle" className="text-2xl font-bold">
        Delete everything
      </h2>
      <p>
        This deletes {parentName}&apos;s circle: names, numbers, connected phones and all messages. {parentName}&apos;s
        phone stops working with it straight away. It cannot be undone.
      </p>
      <form onSubmit={remove} className="flex flex-col gap-3">
        <label className="flex min-h-12 items-center gap-3 font-bold">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="size-6 accent-primary" />
          I understand this cannot be undone
        </label>
        <label className={fLabel}>
          Your PIN
          <input
            className={`${fInput} max-w-xs`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <button type="submit" className={`${fButtonSecondary} self-start border-warning text-warning`} disabled={!sure || pin.length !== 6 || busy}>
          <Trash2 aria-hidden="true" className="size-5" />
          {busy ? "Deleting..." : "Delete the circle"}
        </button>
      </form>
      {error && (
        <p role="alert" className="font-bold text-warning">
          {error}
        </p>
      )}
    </section>
  );
}
