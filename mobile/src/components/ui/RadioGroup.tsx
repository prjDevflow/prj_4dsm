import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { FieldLabel, FieldMessage, fieldStyles } from './Field';
import { Text } from './Text';

export type RadioOption<T extends string> = { value: T; label: string };

type RadioGroupProps<T extends string> = {
  label: string;
  options: RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
};

const OUTER = 20;
const INNER = 10;

/** Few options, all visible at once (the profile of T16). Each row is a 48-tall radio. */
export const RadioGroup = <T extends string>({
  label,
  options,
  value,
  onChange,
  help,
  error,
  disabled = false,
}: RadioGroupProps<T>) => {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} />
      <View accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
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
                // Choosing an option ends the typing: the keyboard would cover the rest of the form.
                Keyboard.dismiss();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.option,
                { minHeight: theme.sizes.touchMin },
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <View
                style={[
                  styles.outer,
                  {
                    borderColor: checked ? colors.primaria : error ? colors.erro : colors.contorno,
                  },
                ]}
              >
                {checked ? (
                  <View style={[styles.inner, { backgroundColor: colors.primaria }]} />
                ) : null}
              </View>
              <Text
                variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}
                style={styles.label}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FieldMessage help={help} error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  outer: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: INNER, height: INNER, borderRadius: INNER / 2 },
  label: { flex: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.38 },
});
