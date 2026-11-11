export interface OutboundMessage {
  idempotencyKey: string;
  to: string;
  body: string;
}

export interface SmsProvider {
  send(message: OutboundMessage): Promise<{ id: string; duplicate: boolean }>;
}

/**
 * In-memory stand-in for the SMS vendor.
 * Like the real API, a repeated idempotency key is acknowledged but not delivered again.
 */
export class FakeSmsProvider implements SmsProvider {
  delivered: OutboundMessage[] = [];
  #seen = new Map<string, string>();

  async send(message: OutboundMessage): Promise<{ id: string; duplicate: boolean }> {
    await new Promise<void>((resolve) => setTimeout(resolve, 1));

    const existing = this.#seen.get(message.idempotencyKey);
    if (existing) {
      return { id: existing, duplicate: true };
    }

    const id = `msg_${this.delivered.length + 1}`;
    this.#seen.set(message.idempotencyKey, id);
    this.delivered.push(message);
    return { id, duplicate: false };
  }
}
