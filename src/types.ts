export interface Recipient {
  id: string;
  firstName: string;
  /** E.164, e.g. +16195550101 */
  phone: string;
  /** IANA time zone, e.g. "America/Los_Angeles". May be missing for imported contacts. */
  timezone?: string;
  /** Prior express written consent to receive marketing texts is on file. */
  consent: boolean;
  /** Recipient has revoked consent (replied STOP, etc.). */
  optedOut: boolean;
}

export interface Campaign {
  id: string;
  /** Compliance-approved static copy, e.g. "Hi {{firstName}}, ..." */
  template: string;
  /** When true, ask the LLM for personalized copy and fall back to `template`. */
  personalize: boolean;
  /** Maximum SMS segments a single message may use. */
  maxSegments: number;
}

export type SkipReason =
  | "opted_out"
  | "no_consent"
  | "unknown_timezone"
  | "quiet_hours"
  | "template_error"
  | "over_budget";

export interface SentMessage {
  recipientId: string;
  body: string;
  segments: number;
  personalized: boolean;
}

export interface DispatchResult {
  sent: SentMessage[];
  skipped: { recipientId: string; reason: SkipReason }[];
}
