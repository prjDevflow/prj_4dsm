import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme, type Theme } from '@/theme';
import { Text } from './Text';
import { useAnnounce } from './useAnnounce';

// Pieces shared by every field: label above, the box, and help or error below.

export const FieldLabel = ({ label }: { label: string }) => {
  const { scale } = useTheme();
  return <Text variant={scale === 'admin' ? 'adminRotulo' : 'pessoaRotulo'}>{label}</Text>;
};

type FieldMessageProps = { help?: string; error?: string };

/** The error replaces the help, with icon and text (never color alone), and is announced. */
export const FieldMessage = ({ help, error }: FieldMessageProps) => {
  const { scale, colors, fontFamily } = useTheme();
  const variant = scale === 'admin' ? 'adminApoio' : 'pessoaApoio';
  useAnnounce(error);

  if (error) {
    return (
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.error}
      >
        <Icon testID="field-error-icon" name="error" size={18} color={colors.erro} />
        <Text
          variant={variant}
          color="erro"
          style={[styles.shrink, { fontFamily: fontFamily.extraBold }]}
        >
          {error}
        </Text>
      </View>
    );
  }
  return help ? (
    <Text variant={variant} color="textoApoio">
      {help}
    </Text>
  ) : null;
};

type FieldBoxState = { focused?: boolean; error?: boolean; readOnly?: boolean };

/** Box of 52 with corner 12: outline, primary when focused, error color, or filled when read-only. */
export const fieldBoxStyle = (
  { colors, radius, sizes }: Theme,
  { focused = false, error = false, readOnly = false }: FieldBoxState,
): ViewStyle => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  minHeight: sizes.field,
  borderRadius: radius.campo,
  borderWidth: focused || error ? 2 : 1,
  paddingHorizontal: focused || error ? 15 : 16,
  borderColor: error
    ? colors.erro
    : focused
      ? colors.primaria
      : readOnly
        ? colors.contornoSuave
        : colors.contorno,
  backgroundColor: readOnly ? colors.superficieBaixa : 'transparent',
});

export const fieldStyles = StyleSheet.create({
  field: { gap: 8 },
});

const styles = StyleSheet.create({
  error: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
});
