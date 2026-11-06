import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme';
import { StatusBadge, badgeLabel, type StatusBadgeProps } from './StatusBadge';
import { Text } from './Text';

type NavRowProps = {
  icon: IconName;
  label: string;
  /** Counter or summary under the text ("4 terminais, 1 offline"). */
  detail?: string;
  /** Highlight before the chevron ("1 offline"). */
  badge?: StatusBadgeProps;
  /** Number in a circle before the chevron; the screen reader reads `label` ("2 ativas"). */
  count?: { value: number; label: string };
  onPress: () => void;
};

/** Navigation row: high surface, corner 20, 64 tall, primary icon and chevron. */
export const NavRow = ({ icon, label, detail, badge, count, onPress }: NavRowProps) => {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, detail, badge && badgeLabel(badge), count?.label]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.superficieAlta,
          borderRadius: theme.radius.cartao,
          minHeight: theme.sizes.navRow,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} color={theme.colors.primaria} />
      <View style={styles.texts}>
        <Text variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}>{label}</Text>
        {detail ? (
          <Text variant={theme.scale === 'admin' ? 'adminApoio' : 'pessoaApoio'} color="textoApoio">
            {detail}
          </Text>
        ) : null}
      </View>
      {badge ? <StatusBadge {...badge} /> : null}
      {count ? (
        <View style={[styles.count, { backgroundColor: theme.colors.primaria }]}>
          <Text variant="adminItem" color="primariaSobre">
            {count.value}
          </Text>
        </View>
      ) : null}
      <Icon name="chevron_right" color={theme.colors.textoApoio} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  texts: { flex: 1, gap: 2 },
  count: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
