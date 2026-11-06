import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';
import { Text } from './Text';

type HeaderProps = {
  title: string;
  /** Shows the "Voltar" arrow. */
  onBack?: () => void;
  backLabel?: string;
  /** Extra action on the right (an icon button, for example). */
  right?: ReactNode;
};

export const Header = ({ title, onBack, backLabel = 'Voltar', right }: HeaderProps) => {
  const { scale, sizes } = useTheme();

  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            { minWidth: sizes.touchMin, minHeight: sizes.touchMin },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="arrow_back" size={28} />
        </Pressable>
      ) : null}
      <Text
        variant={scale === 'admin' ? 'adminTitulo' : 'pessoaTitulo'}
        accessibilityRole="header"
        style={styles.title}
      >
        {title}
      </Text>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingVertical: 8 },
  back: { alignItems: 'center', justifyContent: 'center', marginLeft: -12, borderRadius: 24 },
  pressed: { opacity: 0.7 },
  title: { flex: 1 },
});
