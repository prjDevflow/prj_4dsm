import { useWindowDimensions } from 'react-native';

/** From this system font size on, things side by side go one under the other (200% is 2). */
export const LARGE_FONT_SCALE = 1.3;

export const useLargeFont = () => useWindowDimensions().fontScale >= LARGE_FONT_SCALE;
