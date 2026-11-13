// The UID of an NFC tag, with the same rule as the backend (B16): `:`, `-` and spaces go away and
// the letters become capitals, so "04:a1:b2:c3" and "04A1B2C3" are the same tag.

const SEPARATORS = /[:\-\s]/g;
const HEX_8_TO_20 = /^[0-9A-F]{8,20}$/;

export const normalizeUid = (typed: string) => typed.replace(SEPARATORS, '').toUpperCase();

export const isValidUid = (uid: string) => HEX_8_TO_20.test(uid);

/** The list shows only the end of the code; the detail shows it whole. */
export const maskUid = (uid: string) => `••••${uid.slice(-4)}`;
