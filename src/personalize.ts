import type { Campaign, Recipient } from "./types.ts";
import type { LLMClient } from "./llm.ts";
import { checkCopy } from "./guardrails.ts";

export interface PersonalizeOptions {
  /** Maximum simultaneous LLM calls. */
  concurrency: number;
  /** Retries for retryable errors (429 / 5xx). */
  maxRetries: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface Personalization {
  recipientId: string;
  /** null means "use the approved static template". */
  body: string | null;
}

/**
 * Generates personalized copy for each recipient.
 * This used to run sequentially and took minutes, so it now runs in parallel.
 */
export async function personalizeAll(
  llm: LLMClient,
  campaign: Campaign,
  recipients: Recipient[],
  options: PersonalizeOptions,
): Promise<Personalization[]> {
  return Promise.all(
    recipients.map(async (recipient) => {
      const body = await llm.generate({
        recipientId: recipient.id,
        firstName: recipient.firstName,
        template: campaign.template,
      });
      return { recipientId: recipient.id, body: checkCopy(body).ok ? body : null };
    }),
  );
}
