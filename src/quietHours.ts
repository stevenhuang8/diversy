// Marketing texts may only go out between 8 a.m. and 9 p.m. in the recipient's local time.

export const SEND_WINDOW_START_HOUR = 8;
export const SEND_WINDOW_END_HOUR = 21;

export type WindowCheck =
  | { ok: true }
  | { ok: false; reason: "quiet_hours" | "unknown_timezone" };

export function canSendNow(now: Date, timezone: string | undefined): WindowCheck {
  // Fail closed: never guess a time zone for the recipient.
  if (timezone === undefined || timezone.trim() === "") {
    return { ok: false, reason: "unknown_timezone" };
  }

  const hour = localHour(now, timezone);
  if (hour === null) {
    return { ok: false, reason: "unknown_timezone" };
  }

  // Both window edges fall on the hour, so comparing whole hours is exact.
  if (hour >= SEND_WINDOW_START_HOUR && hour < SEND_WINDOW_END_HOUR) {
    return { ok: true };
  }
  return { ok: false, reason: "quiet_hours" };
}

// Returns the hour (0-23) at `now` in the given IANA time zone, or null if the zone is invalid.
// Uses the runtime's time zone database, so daylight saving time is applied correctly.
function localHour(now: Date, timezone: string): number | null {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" });
  } catch {
    return null;
  }
  const hourPart = formatter.formatToParts(now).find((part) => part.type === "hour");
  if (hourPart === undefined) return null;
  const hour = Number(hourPart.value);
  return Number.isInteger(hour) ? hour % 24 : null;
}
