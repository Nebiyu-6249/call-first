// The evaluation sets: loading and checking eval/messages.json (written alongside the rules, with
// targets) and eval/heldout.json (written independently, without targets).

import { FLAG_IDS, isFlagId, type FlagId } from "@/lib/rules/taxonomy";

export type EvalLabel = "scam" | "normal";

export interface EvalMessage {
  id: string;
  label: EvalLabel;
  type: "text" | "call_description";
  // The warning signs a scam was written to contain. Only used for the coverage table. Empty in a
  // set written without targets.
  targets: FlagId[];
  // Free-text kind of scam, in the held-out set.
  scamType?: string;
  text: string;
}

// Returns the messages, or throws with every problem found.
export function parseDataset(raw: unknown): EvalMessage[] {
  const list = (raw as { messages?: unknown })?.messages;
  if (!Array.isArray(list)) throw new Error("The set needs a 'messages' array.");
  const problems: string[] = [];
  const ids = new Set<string>();
  // Targets are optional for a whole set, but a set that uses them must use them everywhere.
  const withTargets = list.some((item) => (item as Record<string, unknown>)?.targets !== undefined);

  const messages = list.map((item, i): EvalMessage => {
    const m = item as Record<string, unknown>;
    const where = `message ${typeof m.id === "string" ? m.id : `#${i + 1}`}`;
    if (typeof m.id !== "string" || !m.id) problems.push(`${where}: missing id`);
    else if (ids.has(m.id)) problems.push(`${where}: duplicate id`);
    else ids.add(m.id);
    if (m.label !== "scam" && m.label !== "normal") problems.push(`${where}: label must be scam or normal`);
    if (m.type !== "text" && m.type !== "call_description") problems.push(`${where}: type must be text or call_description`);
    if (typeof m.text !== "string" || !m.text.trim()) problems.push(`${where}: missing text`);
    const targets = Array.isArray(m.targets) ? m.targets : [];
    for (const t of targets) if (typeof t !== "string" || !isFlagId(t)) problems.push(`${where}: unknown target ${String(t)}`);
    if (withTargets && m.label === "scam" && targets.length === 0) problems.push(`${where}: a scam needs at least one target`);
    if (m.label === "normal" && targets.length > 0) problems.push(`${where}: a normal message has no targets`);
    if (m.scam_type !== undefined && typeof m.scam_type !== "string") problems.push(`${where}: scam_type must be text`);
    return {
      id: String(m.id),
      label: m.label as EvalLabel,
      type: m.type as EvalMessage["type"],
      targets: targets.filter((t): t is FlagId => typeof t === "string" && isFlagId(t)),
      ...(typeof m.scam_type === "string" ? { scamType: m.scam_type } : {}),
      text: String(m.text ?? ""),
    };
  });

  if (problems.length > 0) throw new Error(`The set has problems:\n- ${problems.join("\n- ")}`);
  return messages;
}

// Whether the set says which warning signs each scam contains (needed for the coverage table).
export function hasTargets(messages: EvalMessage[]): boolean {
  return messages.some((m) => m.targets.length > 0);
}

// Flags that no scam in the set was written to contain.
export function untargetedFlags(messages: EvalMessage[]): FlagId[] {
  const targeted = new Set(messages.flatMap((m) => m.targets));
  return FLAG_IDS.filter((id) => !targeted.has(id));
}
