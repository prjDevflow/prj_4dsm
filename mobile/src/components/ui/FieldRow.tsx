import { Children, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

const CELL_WIDTH = 140;

/**
 * Two short fields side by side (dates, times, coordinates). Each cell needs 140 times the system
 * font scale: with a large font they go one under the other instead of breaking "03/11/2026".
 */
export const FieldRow = ({ children }: { children: ReactNode }) => {
  const { fontScale } = useWindowDimensions();

  return (
    <View style={styles.row}>
      {Children.map(children, (child) => (
        <View testID="field-row-cell" style={[styles.cell, { flexBasis: CELL_WIDTH * fontScale }]}>
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexGrow: 1 },
});
