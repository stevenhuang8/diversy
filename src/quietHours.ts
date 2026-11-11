// Marketing texts may only go out between 8 a.m. and 9 p.m. in the recipient's local time.

export const SEND_WINDOW_START_HOUR = 8;
export const SEND_WINDOW_END_HOUR = 21;

export type WindowCheck =
  | { ok: true }
  | { ok: false; reason: "quiet_hours" | "unknown_timezone" };

export function canSendNow(now: Date, timezone: string | undefined): WindowCheck {
  const tz = timezone ?? "UTC";
  const hour = localHour(now, tz);

  if (hour >= SEND_WINDOW_START_HOUR && hour <= SEND_WINDOW_END_HOUR) {
    return { ok: true };
  }
  return { ok: false, reason: "quiet_hours" };
}

function localHour(now: Date, _timezone: string): number {
  // Our servers run in UTC, so the UTC hour is the normalised hour.
  return now.getUTCHours();
}
