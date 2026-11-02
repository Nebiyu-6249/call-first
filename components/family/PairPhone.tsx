"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";
import { familyApi } from "@/lib/family/api";
import { fButton, fCard } from "./ui";

interface Pairing {
  code: string;
  expiresAt: string;
  qr: string;
  link: string;
}

export function PairPhone({ parentName, connectedPhones }: { parentName: string; connectedPhones: number }) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function makeCode() {
    setBusy(true);
    setError("");
    const res = await familyApi.pairingCode();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const link = `${window.location.origin}/p/pair?code=${res.data.code}`;
    const qr = await QRCode.toDataURL(link, { margin: 1, width: 240, errorCorrectionLevel: "M" });
    setPairing({ ...res.data, qr, link });
  }

  const expires = pairing ? new Date(pairing.expiresAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <section aria-labelledby="pair-heading" className={`${fCard} flex flex-col gap-4`}>
      <h2 id="pair-heading" className="flex items-center gap-2 text-2xl font-bold">
        <Smartphone aria-hidden="true" className="size-7 text-primary" />
        Connect {parentName}&apos;s phone
      </h2>
      <p>
        {connectedPhones === 0
          ? `${parentName}'s phone is not connected yet.`
          : `${connectedPhones} phone${connectedPhones === 1 ? " is" : "s are"} connected. You can connect another.`}
      </p>
      {pairing ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code data URL */}
          <img src={pairing.qr} alt={`QR code that opens the connect page with code ${pairing.code}`} width={240} height={240} className="rounded-lg border-2 border-border" />
          <div className="flex flex-col gap-2">
            <p className="font-mono text-5xl font-bold tracking-widest">
              {pairing.code.slice(0, 3)} {pairing.code.slice(3)}
            </p>
            <p>
              Scan the QR code with {parentName}&apos;s phone camera, or open <span className="break-all font-bold">{pairing.link.split("?")[0]}</span> on
              their phone and type the code.
            </p>
            <p className="text-muted">Works once. Expires at {expires}.</p>
          </div>
        </div>
      ) : (
        <button type="button" onClick={makeCode} disabled={busy} className={`${fButton} self-start`}>
          {busy ? "Making a code..." : "Make a connection code"}
        </button>
      )}
      {error && (
        <p role="alert" className="font-bold text-warning">
          {error}
        </p>
      )}
    </section>
  );
}
