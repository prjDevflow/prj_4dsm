/** How far ahead of the server a terminal clock may be. */
export const OFFLINE_MAX_FUTURE_MS = 5 * 60 * 1000;
/** How long a terminal may keep an event before sending it. */
export const OFFLINE_MAX_PAST_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether the instant a terminal gives for an event it kept while offline is believable: not more than
 * 5 minutes ahead of the server and not more than 7 days behind. Both ends count; one millisecond
 * beyond either is out. The terminal's clock may be wrong, so this is the only guard on what it says.
 */
export function isWithinOfflineWindow(occurredAt: Date, now: Date): boolean {
  const offset = occurredAt.getTime() - now.getTime();
  return offset <= OFFLINE_MAX_FUTURE_MS && offset >= -OFFLINE_MAX_PAST_MS;
}
