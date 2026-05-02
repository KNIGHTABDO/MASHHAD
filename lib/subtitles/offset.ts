/**
 * Parse an SRT/VTT timestamp into total milliseconds.
 * Supports HH:MM:SS,mmm and HH:MM:SS.mmm formats.
 */
export function parseTimeToMs(timestamp: string): number {
  const cleaned = timestamp.trim();
  const match = cleaned.match(/^(\d{2}):(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match) return 0;
  const [, h, m, s, ms] = match;
  return (
    parseInt(h) * 3600000 +
    parseInt(m) * 60000 +
    parseInt(s) * 1000 +
    parseInt(ms)
  );
}

/**
 * Format milliseconds back to SRT/VTT timestamp string: HH:MM:SS,mmm
 */
export function formatMsToTime(totalMs: number): string {
  if (totalMs < 0) totalMs = 0;
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/**
 * Shift a single SRT/VTT timestamp by the given offset in milliseconds.
 */
export function shiftTime(timestamp: string, offsetMs: number): string {
  const original = parseTimeToMs(timestamp);
  return formatMsToTime(original + offsetMs);
}

/**
 * Apply a time offset to all timestamps in a VTT/SRT content string.
 * Adjusts every `start --> end` line by offsetMs milliseconds.
 */
export function applyVttOffset(vttContent: string, offsetMs: number): string {
  return applyVttTimingTransform(vttContent, offsetMs, 0);
}

function formatMsWithSeparator(totalMs: number, separator: "," | "."): string {
  return formatMsToTime(totalMs).replace(",", separator);
}

/**
 * Apply a linear timing correction to all subtitle timestamps.
 * Formula: correctedTime = originalTime * (1 + driftRate) + offsetMs.
 *
 * - offsetMs handles Level 1 global subtitle delay/advance.
 * - driftRate handles Level 2 FPS/cut drift over time.
 */
export function applyVttTimingTransform(
  vttContent: string,
  offsetMs: number,
  driftRate = 0,
): string {
  if (!offsetMs && !driftRate) return vttContent;
  const factor = 1 + driftRate;

  return vttContent.replace(
    /(\d{2}:\d{2}:\d{2}([.,])\d{3})(\s*-->\s*)(\d{2}:\d{2}:\d{2}([.,])\d{3})/g,
    (match, start, startSeparator, arrow, end, endSeparator) => {
      const correctedStart = Math.round(
        parseTimeToMs(start) * factor + offsetMs,
      );
      const correctedEnd = Math.round(parseTimeToMs(end) * factor + offsetMs);
      return `${formatMsWithSeparator(correctedStart, startSeparator)}${arrow}${formatMsWithSeparator(correctedEnd, endSeparator)}`;
    },
  );
}
