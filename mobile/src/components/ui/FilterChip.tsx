import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';
import { Text } from './Text';

type FilterChipProps = { label: string; selected: boolean; onPress: () => void };

/** Selected: primary container with a check. Default: outline. */
export const FilterChip = ({ label, selected, onPress }: FilterChipProps) => {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.touch,
        { minHeight: theme.sizes.touchMin },
        pressed && styles.pressed,
      ]}
    >
      <View
        testID="chip-box"
        style={[
          styles.box,
          {
            borderRadius: theme.radius.filtro,
            backgroundColor: selected ? colors.primariaContainer : 'transparent',
            borderColor: selected ? colors.primariaContainer : colors.contorno,
          },
        ]}
      >
        {selected ? (
          <Icon testID="chip-check" name="check" size={18} color={colors.primariaContainerSobre} />
        ) : null}
        <Text
          variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}
          color={selected ? 'primariaContainerSobre' : 'texto'}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touch: { justifyContent: 'center' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
  },
  pressed: { opacity: 0.8 },
});
