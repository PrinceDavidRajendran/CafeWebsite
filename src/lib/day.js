export function startOfUTCDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Service-day boundary: midnight AWST (UTC+8, no daylight saving).
// Served orders and daily order numbers roll over at 00:00 in Perth time
// (16:00 UTC the previous day).
const AWST_OFFSET_MS = 8 * 3600 * 1000;

export function startOfAWSTDay(d = new Date()) {
  const shifted = new Date(d.getTime() + AWST_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate()
    ) - AWST_OFFSET_MS
  );
}

// AWST calendar date parts (YYYY, MM, DD) for daily keys like order numbers.
export function awstDateParts(d = new Date()) {
  const shifted = new Date(d.getTime() + AWST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    dt: String(shifted.getUTCDate()).padStart(2, "0"),
  };
}
