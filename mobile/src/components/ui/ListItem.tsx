import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';
import { StatusBadge, badgeLabel, type StatusBadgeProps } from './StatusBadge';
import { Text } from './Text';

type ListItemProps = {
  title: string;
  subtitle?: string;
  badge?: StatusBadgeProps;
  /** Left side: initials in a circle, an icon in a shape... */
  leading?: ReactNode;
  /** Shows the chevron and makes the row a button. */
  onPress?: () => void;
  divider?: boolean;
};

/** List row: the screen reader reads title, subtitle and badge as one item. */
export const ListItem = ({
  title,
  subtitle,
  badge,
  leading,
  onPress,
  divider = true,
}: ListItemProps) => {
  const theme = useTheme();
  const label = [title, subtitle, badge && badgeLabel(badge)].filter(Boolean).join(', ');

  const content = (
    <>
      {leading}
      <View
        style={[
          styles.body,
          divider && { borderBottomWidth: 1, borderBottomColor: theme.colors.contornoSuave },
        ]}
      >
        <View style={styles.texts}>
          <Text variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}>{title}</Text>
          {subtitle ? (
            <Text
              variant={theme.scale === 'admin' ? 'adminCorpo' : 'pessoaApoio'}
              color="textoApoio"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {badge ? <StatusBadge {...badge} /> : null}
        {onPress ? <Icon name="chevron_right" color={theme.colors.textoApoio} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    paddingVertical: 12,
  },
  texts: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
