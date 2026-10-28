import { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { SpinningCookie } from '@/components/shapes';
import { useTheme, type ColorName, type Scale } from '@/theme';
import { Text } from './Text';

export type ButtonVariant =
  'principal' | 'tonal' | 'contorno' | 'texto' | 'perigo' | 'perigoContorno' | 'catraca';

// tokens.md, "Cores de cada tipo de botão"
const palette: Record<
  ButtonVariant,
  { background?: ColorName; text: ColorName; border?: ColorName }
> = {
  principal: { background: 'primaria', text: 'primariaSobre' },
  tonal: { background: 'primariaContainer', text: 'primariaContainerSobre' },
  contorno: { text: 'primaria', border: 'contorno' },
  texto: { text: 'primaria' },
  perigo: { background: 'erro', text: 'erroSobre' },
  perigoContorno: { text: 'erro', border: 'erro' },
  catraca: { background: 'acao', text: 'acaoSobre' },
};

export type ButtonProps = {
  label: string;
  /** When it returns a promise, new taps are ignored until it settles. */
  onPress: () => unknown;
  variant?: ButtonVariant;
  /** Defaults to the scale of the ThemeProvider: 60 for the person, 48 for the admin. */
  size?: Scale;
  loading?: boolean;
  /** Text while loading ("Entrando…", "Salvando…"). */
  loadingLabel?: string;
  disabled?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

export const Button = ({
  label,
  onPress,
  variant = 'principal',
  size,
  loading = false,
  loadingLabel,
  disabled = false,
  icon,
  fullWidth = true,
  accessibilityHint,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const pending = useRef(false);
  const scale = size ?? theme.scale;
  const height = scale === 'admin' ? theme.sizes.buttonAdmin : theme.sizes.buttonPessoa;
  const colors = palette[variant];
  const textColor = theme.colors[colors.text];
  const shownLabel = loading ? (loadingLabel ?? label) : label;

  const handlePress = () => {
    if (pending.current || loading || disabled) return;
    const result = onPress();
    if (result instanceof Promise) {
      pending.current = true;
      const release = () => {
        pending.current = false;
      };
      result.then(release, (error: unknown) => {
        release();
        throw error;
      });
    }
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={shownLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          borderRadius: height / 2,
          paddingHorizontal: scale === 'admin' ? 20 : 24,
          backgroundColor: colors.background ? theme.colors[colors.background] : 'transparent',
          borderColor: colors.border ? theme.colors[colors.border] : undefined,
          borderWidth: colors.border ? 1 : 0,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <SpinningCookie color={textColor} size={scale === 'admin' ? 18 : 22} />
      ) : icon ? (
        <Icon name={icon} size={scale === 'admin' ? 18 : 22} color={textColor} />
      ) : null}
      <Text
        variant={scale === 'admin' ? 'adminBotao' : 'pessoaBotao'}
        color={colors.text}
        style={styles.label}
      >
        {shownLabel}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  label: { textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.38 },
});
