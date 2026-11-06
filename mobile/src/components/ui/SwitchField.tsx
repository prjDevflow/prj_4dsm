import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type SwitchFieldProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  help?: string;
  disabled?: boolean;
};

/** M3 switch (52 × 32). The whole row, label included, receives the tap. */
export const SwitchField = ({
  label,
  value,
  onValueChange,
  help,
  disabled = false,
}: SwitchFieldProps) => {
  const theme = useTheme();
  const { colors, sizes } = theme;
  const thumb = value ? 24 : 16;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={help}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.row, { minHeight: sizes.touchMin }, disabled && styles.disabled]}
    >
      <View style={styles.texts}>
        <Text variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}>{label}</Text>
        {help ? (
          <Text variant={theme.scale === 'admin' ? 'adminApoio' : 'pessoaApoio'} color="textoApoio">
            {help}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.track,
          {
            width: sizes.switchWidth,
            height: sizes.switchHeight,
            borderRadius: sizes.switchHeight / 2,
            backgroundColor: value ? colors.primaria : colors.superficieMaxima,
            borderColor: value ? colors.primaria : colors.contorno,
            justifyContent: value ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        <View
          style={{
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            backgroundColor: value ? colors.primariaSobre : colors.contorno,
          }}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  texts: { flex: 1, gap: 2 },
  track: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, paddingHorizontal: 4 },
  disabled: { opacity: 0.38 },
});
