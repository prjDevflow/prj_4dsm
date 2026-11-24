import { Pressable, StyleSheet } from 'react-native';
import { Circle } from '@/components/shapes';
import { initials } from '@/lib/perfil';
import { useTheme } from '@/theme';
import { Text } from './Text';

type AvatarProps = {
  nome: string;
  size?: number;
  /** Makes the initials a button ("Minha conta"); then accessibilityLabel is required. */
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

/** Initials in a circle of the primary container (T03, T13, T14, T15). */
export const Avatar = ({ nome, size = 48, onPress, accessibilityLabel, testID }: AvatarProps) => {
  const theme = useTheme();
  const circle = (
    <Circle color={theme.colors.primariaContainer} size={size} testID={testID}>
      <Text
        variant={size >= 72 ? 'pessoaTitulo' : 'adminItem'}
        color="primariaContainerSobre"
        allowFontScaling={false}
      >
        {initials(nome)}
      </Text>
    </Circle>
  );

  if (!onPress) return circle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.touch,
        { minWidth: theme.sizes.touchMin, minHeight: theme.sizes.touchMin },
        pressed && styles.pressed,
      ]}
    >
      {circle}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touch: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
