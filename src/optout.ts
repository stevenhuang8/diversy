// Inbound SMS replies are classified before they reach the CRM.
// "opt_out" flips Recipient.optedOut; "review" goes to the compliance queue.

export type InboundIntent = "opt_out" | "review" | "none";

const OPT_OUT_KEYWORDS = ["stop", "quit", "end", "revoke", "opt out", "cancel", "unsubscribe"];

// Lowercase, treat hyphens and punctuation as spaces, collapse whitespace.
function normalize(body: string): string {
  return body
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyInbound(body: string): InboundIntent {
  const normalized = normalize(body);

  if (OPT_OUT_KEYWORDS.includes(normalized)) {
    return "opt_out";
  }

  const padded = ` ${normalized} `;
  if (OPT_OUT_KEYWORDS.some((keyword) => padded.includes(` ${keyword} `))) {
    return "review";
  }

  return "none";
}
