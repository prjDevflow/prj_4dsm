import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, type ColorName } from '@/theme';

type CardTone = 'padrao' | 'baixa' | 'alta' | 'container';

const backgrounds: Record<CardTone, ColorName> = {
  padrao: 'superficie',
  baixa: 'superficieBaixa',
  alta: 'superficieAlta',
  container: 'primariaContainer',
};

type CardProps = {
  children: ReactNode;
  /** "container": highlight card of the home (primary container, corner 28). */
  tone?: CardTone;
  /** Makes the whole card a button; then accessibilityLabel is required. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const Card = ({
  children,
  tone = 'padrao',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) => {
  const theme = useTheme();
  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors[backgrounds[tone]],
      borderRadius: tone === 'container' ? theme.radius.cartaoGrande : theme.radius.cartao,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={cardStyle}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  pressed: { opacity: 0.85 },
});
