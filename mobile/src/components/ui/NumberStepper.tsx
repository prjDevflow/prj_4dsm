import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme';
import { FieldLabel, FieldMessage, fieldStyles } from './Field';
import { Text } from './Text';

type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  error?: string;
};

type StepButtonProps = { icon: IconName; label: string; disabled: boolean; onPress: () => void };

const StepButton = ({ icon, label, disabled, onPress }: StepButtonProps) => {
  const theme = useTheme();
  const size = theme.scale === 'admin' ? theme.sizes.buttonAdmin : theme.sizes.buttonPessoa;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.step,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primariaContainer,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={28} color={theme.colors.primariaContainerSobre} />
    </Pressable>
  );
};

/** Big "−" and "+" with the value in the middle; never goes past min or max. */
export const NumberStepper = ({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  help,
  error,
}: NumberStepperProps) => {
  const canDecrease = value - step >= min;
  const canIncrease = value + step <= max;
  const decrease = () => canDecrease && onChange(value - step);
  const increase = () => canIncrease && onChange(value + step);

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} />
      <View style={styles.row}>
        <StepButton
          icon="remove"
          label={`Diminuir ${label}`}
          disabled={!canDecrease}
          onPress={decrease}
        />
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'increment') increase();
            if (nativeEvent.actionName === 'decrement') decrease();
          }}
          style={styles.value}
        >
          <Text variant="pessoaDestaque">{value}</Text>
        </View>
        <StepButton
          icon="add"
          label={`Aumentar ${label}`}
          disabled={!canIncrease}
          onPress={increase}
        />
      </View>
      <FieldMessage help={help} error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  step: { alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 64, alignItems: 'center' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.38 },
});
