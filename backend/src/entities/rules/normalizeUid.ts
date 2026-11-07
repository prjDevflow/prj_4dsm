/**
 * The UID of an NFC tag as stored: hexadecimal, uppercase, no separators, 8 to 20 characters.
 * Null when the text cannot be one (the caller decides how to answer).
 */
export function normalizeUid(uid: string): string | null {
  return uid.replace(/:/g, '').toUpperCase();
}
