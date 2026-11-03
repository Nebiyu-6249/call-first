// The evaluation set: loading and checking eval/messages.json.

import { FLAG_IDS, isFlagId, type FlagId } from "@/lib/rules/taxonomy";

export type EvalLabel = "scam" | "normal";

export interface EvalMessage {
  id: string;
  label: EvalLabel;
  type: "text" | "call_description";
  // The warning signs a scam was written to contain. Only used for the coverage table.
  targets: FlagId[];
  text: string;
}

// Returns the messages, or throws with every problem found.
export function parseDataset(raw: unknown): EvalMessage[] {
  const list = (raw as { messages?: unknown })?.messages;
  if (!Array.isArray(list)) throw new Error("messages.json needs a 'messages' array.");
  const problems: string[] = [];
  const ids = new Set<string>();

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
    if (m.label === "scam" && targets.length === 0) problems.push(`${where}: a scam needs at least one target`);
    if (m.label === "normal" && targets.length > 0) problems.push(`${where}: a normal message has no targets`);
    return {
      id: String(m.id),
      label: m.label as EvalLabel,
      type: m.type as EvalMessage["type"],
      targets: targets.filter((t): t is FlagId => typeof t === "string" && isFlagId(t)),
      text: String(m.text ?? ""),
    };
  });

  if (problems.length > 0) throw new Error(`messages.json has problems:\n- ${problems.join("\n- ")}`);
  return messages;
}

// Flags that no scam in the set was written to contain.
export function untargetedFlags(messages: EvalMessage[]): FlagId[] {
  const targeted = new Set(messages.flatMap((m) => m.targets));
  return FLAG_IDS.filter((id) => !targeted.has(id));
}
