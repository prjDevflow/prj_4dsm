import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

type ProgressBarProps = {
  /** Filled part (entries used, for example). Clamped between 0 and total. */
  value: number;
  total: number;
  /** What the bar measures ("Entradas usadas"); the screen reader also reads value and total. */
  accessibilityLabel: string;
};

/** Two rectangles of 8 (corner 4) in the proportion value ÷ total. */
export const ProgressBar = ({ value, total, accessibilityLabel }: ProgressBarProps) => {
  const theme = useTheme();
  const now = Math.min(Math.max(value, 0), total);
  const rest = total - now;
  const bar = { height: theme.sizes.progress, borderRadius: theme.sizes.progress / 2 };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now }}
      style={styles.row}
    >
      {now > 0 ? (
        <View
          testID="progress-fill"
          style={[styles.part, bar, { flexGrow: now, backgroundColor: theme.colors.primaria }]}
        />
      ) : null}
      {rest > 0 ? (
        <View
          testID="progress-rest"
          style={[
            styles.part,
            bar,
            { flexGrow: rest, backgroundColor: theme.colors.superficieMaxima },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  part: { flexBasis: 0 },
});
