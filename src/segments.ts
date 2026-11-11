// Carriers bill SMS per segment, so finance reconciles these counts against the invoice.

export type Encoding = "GSM-7" | "UCS-2";

export interface SegmentInfo {
  encoding: Encoding;
  /** Encoded length: septets for GSM-7, UTF-16 code units for UCS-2. */
  units: number;
  segments: number;
}

// GSM 03.38 basic character set (escape character omitted).
const GSM7_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);

// GSM 03.38 extension table: each of these is sent as ESC + char.
const GSM7_EXTENSION = new Set("\f^{}\\[~]|€");

export function detectEncoding(text: string): Encoding {
  for (const ch of text) {
    if (!GSM7_BASIC.has(ch) && !GSM7_EXTENSION.has(ch)) {
      return "UCS-2";
    }
  }
  return "GSM-7";
}

export function countSegments(text: string): SegmentInfo {
  const encoding = detectEncoding(text);
  const units = text.length;
  const limit = encoding === "GSM-7" ? 160 : 70;
  const segments = units === 0 ? 0 : Math.ceil(units / limit);
  return { encoding, units, segments };
}
