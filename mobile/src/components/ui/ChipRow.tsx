import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLargeFont } from './useLargeFont';

/**
 * Row of filters. With the normal font it scrolls sideways; with a large font the chips wrap, so no
 * filter stays hidden past the edge of the screen (F14).
 */
export const ChipRow = ({ children }: { children: ReactNode }) => {
  const large = useLargeFont();

  if (large) {
    return (
      <View testID="chip-row" style={[styles.chips, styles.wrap]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      testID="chip-row"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chips: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
