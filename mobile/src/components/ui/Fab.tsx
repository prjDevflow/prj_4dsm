import { Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme, type ColorName } from '@/theme';
import { Text } from './Text';

type FabProps = {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** "catraca": yellow "Abrir catraca" of the admin home (T14). */
  variant?: 'padrao' | 'catraca';
  /** Floats in the bottom-right corner. Pass false to place it yourself. */
  floating?: boolean;
};

const palette: Record<
  NonNullable<FabProps['variant']>,
  { background: ColorName; text: ColorName }
> = {
  padrao: { background: 'primariaContainer', text: 'primariaContainerSobre' },
  catraca: { background: 'acao', text: 'acaoSobre' },
};

export const Fab = ({ label, icon, onPress, variant = 'padrao', floating = true }: FabProps) => {
  const theme = useTheme();
  const colors = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.colors[colors.background],
          borderRadius: theme.radius.fab,
          minHeight: theme.sizes.fab,
        },
        floating && styles.floating,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} color={theme.colors[colors.text]} />
      <Text variant="adminBotao" color={colors.text} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 3,
  },
  floating: { position: 'absolute', right: 16, bottom: 16, maxWidth: '80%' },
  label: { flexShrink: 1 },
  pressed: { opacity: 0.85 },
});
