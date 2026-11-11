// LLM client interface plus a deterministic fake used by tests and local runs.
// The fake behaves like the real provider: it returns 429 when too many calls are in flight.

export class RateLimitError extends Error {
  retryable = true;
  constructor(message = "429 Too Many Requests") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class TransientError extends Error {
  retryable = true;
  constructor(message = "503 Service Unavailable") {
    super(message);
    this.name = "TransientError";
  }
}

export class PermanentError extends Error {
  retryable = false;
  constructor(message = "400 Bad Request: content policy") {
    super(message);
    this.name = "PermanentError";
  }
}

export interface GenerateRequest {
  recipientId: string;
  firstName: string;
  template: string;
}

export interface LLMClient {
  generate(request: GenerateRequest): Promise<string>;
}

export interface FakeLLMOptions {
  /** Provider-side limit. Calls beyond it are rejected with RateLimitError. */
  maxConcurrent?: number;
  latencyMs?: number;
  latencyFor?: Record<string, number>;
  /** Recipient id -> number of calls that fail with TransientError before succeeding. */
  failTimesFor?: Record<string, number>;
  /** Every call for these recipients fails with PermanentError. */
  alwaysFailFor?: string[];
  /** Recipient id -> canned response. */
  responses?: Record<string, string>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class FakeLLM implements LLMClient {
  inFlight = 0;
  peakInFlight = 0;
  calls: GenerateRequest[] = [];
  #options: FakeLLMOptions;

  constructor(options: FakeLLMOptions = {}) {
    this.#options = options;
  }

  callsFor(recipientId: string): number {
    return this.calls.filter((call) => call.recipientId === recipientId).length;
  }

  async generate(request: GenerateRequest): Promise<string> {
    const { recipientId, firstName } = request;
    const options = this.#options;
    this.calls.push(request);

    if (this.inFlight >= (options.maxConcurrent ?? 4)) {
      throw new RateLimitError();
    }

    this.inFlight += 1;
    this.peakInFlight = Math.max(this.peakInFlight, this.inFlight);
    try {
      await wait(options.latencyFor?.[recipientId] ?? options.latencyMs ?? 5);

      if (options.alwaysFailFor?.includes(recipientId)) {
        throw new PermanentError();
      }
      if (this.callsFor(recipientId) <= (options.failTimesFor?.[recipientId] ?? 0)) {
        throw new TransientError();
      }

      return (
        options.responses?.[recipientId] ??
        `Hi ${firstName}! Your quarterly update is ready: https://go.acme-invest.example/u/${recipientId}`
      );
    } finally {
      this.inFlight -= 1;
    }
  }
}
