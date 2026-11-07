import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';
import { FieldLabel, FieldMessage, fieldStyles } from './Field';
import type { RadioOption } from './RadioGroup';
import { Text } from './Text';

type SegmentedFieldProps<T extends string> = {
  label: string;
  options: RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
};

/** Two to four short options side by side (the type of an access point, T19). */
export const SegmentedField = <T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  disabled = false,
}: SegmentedFieldProps<T>) => {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[
          styles.group,
          { borderRadius: theme.radius.pilula, borderColor: error ? colors.erro : colors.contorno },
        ]}
      >
        {options.map((option, index) => {
          const checked = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityHint={error}
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => {
                Keyboard.dismiss();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.segment,
                {
                  minHeight: theme.sizes.touchMin,
                  backgroundColor: checked ? colors.primariaContainer : 'transparent',
                  borderLeftColor: colors.contorno,
                },
                index > 0 && styles.divider,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              {checked ? (
                <Icon
                  testID="segment-check"
                  name="check"
                  size={18}
                  color={colors.primariaContainerSobre}
                />
              ) : null}
              <Text
                variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}
                color={checked ? 'primariaContainerSobre' : 'texto'}
                style={styles.label}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FieldMessage error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  divider: { borderLeftWidth: 1 },
  label: { flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.38 },
});
