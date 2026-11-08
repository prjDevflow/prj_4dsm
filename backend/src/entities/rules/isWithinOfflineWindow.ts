/** How far ahead of the server a terminal clock may be. */
export const OFFLINE_MAX_FUTURE_MS = 5 * 60 * 1000;
/** How long a terminal may keep an event before sending it. */
export const OFFLINE_MAX_PAST_MS = 7 * 24 * 60 * 60 * 1000;

export function isWithinOfflineWindow(_occurredAt: Date, _now: Date): boolean {
  return false;
}
