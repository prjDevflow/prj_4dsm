const SEPARATORS = /[:\-\s]/g;
// Same format as the `nfc_tags_uid_formato_chk` CHECK, in either case. Checked before the upper case:
// some characters only turn into hexadecimal there ('ﬀ' becomes 'FF').
const VALID_UID = /^[0-9A-Fa-f]{8,20}$/;

/**
 * The UID as it is stored: hexadecimal, uppercase, no separators, 8 to 20 characters.
 * Null when `raw` is not a valid UID.
 */
export function normalizeUid(raw: string): string | null {
  const uid = raw.replace(SEPARATORS, '');
  return VALID_UID.test(uid) ? uid.toUpperCase() : null;
}
