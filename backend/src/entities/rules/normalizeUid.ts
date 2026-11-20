// Hex is checked before the case change, so no exotic character can become a letter of the alphabet.
const UID_PATTERN = /^[0-9A-Fa-f]{8,20}$/;

/**
 * The UID of an NFC tag as stored: hexadecimal, uppercase, no separators, 8 to 20 characters.
 * Colons, hyphens and whitespace are dropped. Null when the text cannot be one (the caller decides
 * how to answer).
 */
export function normalizeUid(uid: string): string | null {
  const bare = uid.replace(/[:\-\s]/g, '');
  return UID_PATTERN.test(bare) ? bare.toUpperCase() : null;
}
