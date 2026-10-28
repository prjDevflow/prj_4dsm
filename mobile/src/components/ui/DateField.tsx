import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { formatIsoDate, fromIsoDate, fromTime, toIsoDate, toTime } from '@/lib/dateValue';
import { useReducedMotion, useTheme } from '@/theme';
import { Button } from './Button';
import { FieldLabel, FieldMessage, fieldBoxStyle, fieldStyles } from './Field';
import { Text } from './Text';

type PickerFieldProps = {
  mode: 'date' | 'time';
  label: string;
  /** Text in the box: the formatted value, or the expected format when empty. */
  shownValue: string | null;
  placeholder: string;
  icon: IconName;
  pickerValue: Date;
  onPick: (date: Date) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

// Android opens the system dialog; iOS shows the picker in a bottom sheet with "Pronto".
const PickerField = ({
  mode,
  label,
  shownValue,
  placeholder,
  icon,
  pickerValue,
  onPick,
  help,
  error,
  disabled = false,
  minimumDate,
  maximumDate,
}: PickerFieldProps) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) onPick(date);
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode,
        is24Hour: true,
        minimumDate,
        maximumDate,
        onChange: handleChange,
      });
      return;
    }
    setOpen(true);
  };

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: shownValue ?? 'Nenhum valor escolhido' }}
        accessibilityHint={error ?? help}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        style={[fieldBoxStyle(theme, { error: !!error }), disabled && styles.disabled]}
      >
        <Text color={shownValue ? 'texto' : 'contorno'} style={styles.value}>
          {shownValue ?? placeholder}
        </Text>
        <Icon name={icon} color={theme.colors.textoApoio} />
      </Pressable>
      <FieldMessage help={help} error={error} />

      {Platform.OS !== 'android' ? (
        <Modal
          visible={open}
          transparent
          animationType={reducedMotion ? 'none' : 'slide'}
          onRequestClose={() => setOpen(false)}
        >
          <View style={[styles.scrim, { backgroundColor: theme.colors.veu }]}>
            <View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.superficieAlta,
                  borderTopLeftRadius: theme.radius.dialogo,
                  borderTopRightRadius: theme.radius.dialogo,
                },
              ]}
            >
              <Text variant="pessoaDestaque" accessibilityRole="header">
                {label}
              </Text>
              <DateTimePicker
                value={pickerValue}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                locale="pt-BR"
                themeVariant="dark"
                accentColor={theme.colors.primaria}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleChange}
              />
              <Button label="Pronto" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD", as in the contract. */
  value: string | null;
  onChange: (value: string) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
  /** "YYYY-MM-DD" */
  minimumDate?: string;
  /** "YYYY-MM-DD" */
  maximumDate?: string;
};

/** Shows dd/MM/aaaa and delivers YYYY-MM-DD. */
export const DateField = ({
  value,
  onChange,
  minimumDate,
  maximumDate,
  ...props
}: DateFieldProps) => (
  <PickerField
    {...props}
    mode="date"
    icon="calendar_month"
    shownValue={value ? formatIsoDate(value) : null}
    placeholder="dd/mm/aaaa"
    pickerValue={value ? fromIsoDate(value) : new Date()}
    onPick={(date) => onChange(toIsoDate(date))}
    minimumDate={minimumDate ? fromIsoDate(minimumDate) : undefined}
    maximumDate={maximumDate ? fromIsoDate(maximumDate) : undefined}
  />
);

type TimeFieldProps = {
  label: string;
  /** "HH:mm", as in the contract. */
  value: string | null;
  onChange: (value: string) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
};

/** Shows and delivers HH:mm (24 h). */
export const TimeField = ({ value, onChange, ...props }: TimeFieldProps) => (
  <PickerField
    {...props}
    mode="time"
    icon="schedule"
    shownValue={value}
    placeholder="hh:mm"
    pickerValue={value ? fromTime(value) : new Date()}
    onPick={(date) => onChange(toTime(date))}
  />
);

const styles = StyleSheet.create({
  value: { flex: 1, paddingVertical: 12 },
  disabled: { opacity: 0.38 },
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: 24, paddingBottom: 40, gap: 16 },
});
