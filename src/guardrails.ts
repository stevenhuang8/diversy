// Checks run on every AI-written message before it can be sent.

export const APPROVED_LINK_HOST = "go.acme-invest.example";

const PROHIBITED_CLAIMS = /\b(guaranteed?|risk[- ]free|no risk|can['’]?t lose)\b/i;
const URL_PATTERN = /https?:\/\/\S+/i;

export type Violation = "prohibited_claim" | "unapproved_link";

export interface CopyCheck {
  ok: boolean;
  violations: Violation[];
}

export function checkCopy(text: string): CopyCheck {
  const violations: Violation[] = [];

  if (PROHIBITED_CLAIMS.test(text)) {
    violations.push("prohibited_claim");
  }

  if (URL_PATTERN.test(text) && !text.includes(APPROVED_LINK_HOST)) {
    violations.push("unapproved_link");
  }

  return { ok: violations.length === 0, violations };
}
