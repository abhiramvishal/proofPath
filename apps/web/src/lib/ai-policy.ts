import type { AIPolicyTier, AIAssistMode } from "@proofpath/types";

export const AI_POLICY_LABELS: Record<AIPolicyTier, string> = {
  locked: "Locked — No AI",
  grammar: "Grammar & Spell Only",
  outline: "Outline Assist",
  chat: "Chat Panel — Query Only",
  inline: "Inline Suggestions",
  full: "Full — Logged",
};

export const AI_POLICY_DESCRIPTIONS: Record<AIPolicyTier, string> = {
  locked: "No AI assistance. Paste from external sources is blocked.",
  grammar: "Grammar and spelling corrections only.",
  outline: "AI may suggest structural outlines, not prose.",
  chat: "Ask questions; responses cannot be inserted into the document.",
  inline: "Copilot-style completions, fully logged.",
  full: "Unrestricted AI use with full interaction logging.",
};

export const AI_POLICY_OPTIONS: AIPolicyTier[] = [
  "locked",
  "grammar",
  "outline",
  "chat",
  "inline",
  "full",
];

export function canUseAIChat(tier: AIPolicyTier): boolean {
  return ["chat", "inline", "full", "grammar", "outline"].includes(tier);
}

export function canUseInline(tier: AIPolicyTier): boolean {
  return ["inline", "full"].includes(tier);
}

export function canUseGrammar(tier: AIPolicyTier): boolean {
  return tier !== "locked";
}

export function canUseOutline(tier: AIPolicyTier): boolean {
  return ["outline", "chat", "inline", "full"].includes(tier);
}

export function isPasteBlocked(tier: AIPolicyTier): boolean {
  return tier === "locked";
}

/** Map policy tier to default AI panel mode */
export function defaultAIMode(tier: AIPolicyTier): AIAssistMode {
  if (tier === "grammar") return "grammar";
  if (tier === "outline") return "outline";
  if (tier === "chat") return "chat";
  return "inline";
}

export function allowedModes(tier: AIPolicyTier): AIAssistMode[] {
  switch (tier) {
    case "locked":
      return [];
    case "grammar":
      return ["grammar"];
    case "outline":
      return ["outline", "chat"];
    case "chat":
      return ["chat"];
    case "inline":
      return ["inline", "chat"];
    case "full":
      return ["grammar", "outline", "chat", "inline"];
    default:
      return [];
  }
}
