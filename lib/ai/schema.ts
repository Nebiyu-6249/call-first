// The shape of the AI analysis, as a JSON schema for Structured Outputs and as a TypeScript type.
// Everything the model returns is checked and cleaned by `parseAiAnalysis` before use.

import { extractLinks, extractPhoneNumbers } from "@/lib/rules/extract";
import { FLAG_IDS, isFlagId } from "@/lib/rules/taxonomy";
import type { AiAssessment, AiFlag } from "@/lib/verdict";

export const SENDER_TYPES = ["bank", "government", "police", "delivery", "family", "company", "unknown"] as const;
export type SenderType = (typeof SENDER_TYPES)[number];

const ASSESSMENTS = ["likely_scam", "unclear", "likely_normal"] as const;

export interface AiAnalysis {
  extracted_text: string;
  input_summary: string;
  flags: AiFlag[];
  claimed_sender_type: SenderType;
  // Who the message claims to be when it is a family member, for example "son" or "Sara".
  claimed_person: string;
  asked_for: string[];
  phone_numbers_in_message: string[];
  links_in_message: string[];
  ai_assessment: AiAssessment;
  confidence: number;
  plain_explanation: string;
}

const stringArray = { type: "array", items: { type: "string" } } as const;

// Strict mode: every property is required and no extra properties are allowed.
// Length limits are enforced in code below rather than in the schema.
export const AI_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "extracted_text",
    "input_summary",
    "flags",
    "claimed_sender_type",
    "claimed_person",
    "asked_for",
    "phone_numbers_in_message",
    "links_in_message",
    "ai_assessment",
    "confidence",
    "plain_explanation",
  ],
  properties: {
    extracted_text: { type: "string" },
    input_summary: { type: "string" },
    flags: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "evidence", "note"],
        properties: {
          id: { type: "string", enum: [...FLAG_IDS, "other"] },
          evidence: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    claimed_sender_type: { type: "string", enum: [...SENDER_TYPES] },
    claimed_person: { type: "string" },
    asked_for: stringArray,
    phone_numbers_in_message: stringArray,
    links_in_message: stringArray,
    ai_assessment: { type: "string", enum: [...ASSESSMENTS] },
    confidence: { type: "number" },
    plain_explanation: { type: "string" },
  },
} as const;

const MAX_EVIDENCE_WORDS = 12;
const MAX_EXPLANATION_SENTENCES = 3;
const MAX_TEXT = 5000;
const MAX_SHORT_TEXT = 300;
const MAX_LIST = 10;

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => str(v, MAX_SHORT_TEXT)).filter(Boolean).slice(0, MAX_LIST);
}

function words(text: string, max: number): string {
  return text.split(/\s+/).filter(Boolean).slice(0, max).join(" ");
}

// The parent must only ever be pointed to numbers and links their family saved.
// If the AI repeats a number or link in its own words, remove it.
export function stripContactDetails(text: string): string {
  let out = text;
  for (const link of extractLinks(out)) out = out.split(link.text).join("the link in the message");
  for (const phone of extractPhoneNumbers(out)) out = out.split(phone).join("the number in the message");
  return out;
}

function sentences(text: string, max: number): string {
  const parts = text.match(/[^.!?]+[.!?]*/g) ?? [];
  return parts.slice(0, max).join("").trim();
}

// Returns null when the value is not a usable analysis.
export function parseAiAnalysis(value: unknown): AiAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.ai_assessment !== "string" || !(ASSESSMENTS as readonly string[]).includes(v.ai_assessment)) {
    return null;
  }
  if (typeof v.confidence !== "number" || Number.isNaN(v.confidence)) return null;

  const flags: AiFlag[] = [];
  if (Array.isArray(v.flags)) {
    for (const f of v.flags) {
      if (!f || typeof f !== "object") continue;
      const id = (f as Record<string, unknown>).id;
      if (typeof id !== "string" || !(id === "other" || isFlagId(id))) continue;
      if (flags.some((existing) => existing.id === id)) continue;
      flags.push({
        id,
        evidence: words(str((f as Record<string, unknown>).evidence, MAX_SHORT_TEXT), MAX_EVIDENCE_WORDS),
        note: str((f as Record<string, unknown>).note, MAX_SHORT_TEXT),
      });
    }
  }

  const sender = typeof v.claimed_sender_type === "string" ? v.claimed_sender_type : "unknown";

  return {
    extracted_text: str(v.extracted_text, MAX_TEXT),
    input_summary: stripContactDetails(sentences(str(v.input_summary, MAX_SHORT_TEXT), 1)),
    flags,
    claimed_sender_type: (SENDER_TYPES as readonly string[]).includes(sender) ? (sender as SenderType) : "unknown",
    claimed_person: str(v.claimed_person, 60),
    asked_for: strList(v.asked_for),
    phone_numbers_in_message: strList(v.phone_numbers_in_message),
    links_in_message: strList(v.links_in_message),
    ai_assessment: v.ai_assessment as AiAssessment,
    confidence: Math.min(1, Math.max(0, v.confidence)),
    plain_explanation: stripContactDetails(
      sentences(str(v.plain_explanation, 600), MAX_EXPLANATION_SENTENCES),
    ),
  };
}
