// Inbound SMS replies are classified before they reach the CRM.
// "opt_out" flips Recipient.optedOut; "review" goes to the compliance queue.

export type InboundIntent = "opt_out" | "review" | "none";

const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];

export function classifyInbound(body: string): InboundIntent {
  if (OPT_OUT_KEYWORDS.includes(body)) {
    return "opt_out";
  }

  for (const keyword of OPT_OUT_KEYWORDS) {
    if (body.includes(keyword)) {
      return "review";
    }
  }

  return "none";
}
