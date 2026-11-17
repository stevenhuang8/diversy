import { randomUUID } from "node:crypto";
import type { Campaign, DispatchResult, Recipient } from "./types.ts";
import type { LLMClient } from "./llm.ts";
import type { SmsProvider } from "./provider.ts";
import { canSendNow } from "./quietHours.ts";
import { personalizeAll, type PersonalizeOptions } from "./personalize.ts";
import { countSegments } from "./segments.ts";
import { MissingVariableError, render } from "./template.ts";

export interface DispatchDeps {
  llm: LLMClient;
  provider: SmsProvider;
  now: Date;
  personalize?: Partial<PersonalizeOptions>;
}

const DEFAULT_PERSONALIZE: PersonalizeOptions = { concurrency: 4, maxRetries: 2 };

export async function dispatchCampaign(
  campaign: Campaign,
  recipients: Recipient[],
  deps: DispatchDeps,
): Promise<DispatchResult> {
  const result: DispatchResult = { sent: [], skipped: [] };

  const eligible = recipients.filter((recipient) => {
    if (recipient.optedOut) {
      result.skipped.push({ recipientId: recipient.id, reason: "opted_out" });
      return false;
    }
    const window = canSendNow(deps.now, recipient.timezone);
    if (!window.ok) {
      result.skipped.push({ recipientId: recipient.id, reason: window.reason });
      return false;
    }
    return true;
  });

  const personalized = campaign.personalize
    ? await personalizeAll(deps.llm, campaign, eligible, { ...DEFAULT_PERSONALIZE, ...deps.personalize })
    : eligible.map((recipient) => ({ recipientId: recipient.id, body: null }));

  for (const [index, recipient] of eligible.entries()) {
    let body = personalized[index].body;
    let isPersonalized = body !== null;

    if (body !== null && countSegments(body).segments > campaign.maxSegments) {
      body = null;
      isPersonalized = false;
    }

    if (body === null) {
      try {
        body = render(campaign.template, { firstName: recipient.firstName });
      } catch (error) {
        if (error instanceof MissingVariableError) {
          result.skipped.push({ recipientId: recipient.id, reason: "template_error" });
          continue;
        }
        throw error;
      }
    }

    const { segments } = countSegments(body);
    if (segments > campaign.maxSegments) {
      result.skipped.push({ recipientId: recipient.id, reason: "over_budget" });
      continue;
    }

    // Unique key per message so the vendor never drops a send.
    await deps.provider.send({
      idempotencyKey: `${campaign.id}:${recipient.id}:${randomUUID()}`,
      to: recipient.phone,
      body,
    });
    result.sent.push({ recipientId: recipient.id, body, segments, personalized: isPersonalized });
  }

  return result;
}
