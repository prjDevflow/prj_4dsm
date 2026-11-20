// Coordinates are typed with a comma or a dot (❓ 9) and travel to the API as numbers.

const NUMBER = /^[+-]?\d+([.,]\d+)?$/;

/** "-23,30512" → -23.30512; anything that is not one number → null. */
export const parseCoordinate = (text: string): number | null => {
  const trimmed = text.trim();
  if (!NUMBER.test(trimmed)) return null;
  return Number(trimmed.replace(',', '.'));
};

/** -23.30512 → "-23,30512": comma, at most 6 decimals (about 10 cm), no trailing zeros. */
export const formatCoordinate = (value: number): string =>
  String(Number(value.toFixed(6))).replace('.', ',');
