import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';
import { StatusBadge, badgeLabel, type StatusBadgeProps } from './StatusBadge';
import { Text } from './Text';

type ListItemProps = {
  title: string;
  subtitle?: string;
  /** More lines in the style of the subtitle (period, entries...). */
  details?: string[];
  /** Third line, in bold support text ("Visto há 12 min"). */
  meta?: string;
  /** One badge, or several side by side (profile and "Inativo", for example). */
  badge?: StatusBadgeProps | StatusBadgeProps[];
  /** Left side: initials in a circle, an icon in a shape... */
  leading?: ReactNode;
  /** Shows the chevron and makes the row a button. */
  onPress?: () => void;
  divider?: boolean;
};

const STACK_FONT_SCALE = 1.3;

/** List row: the screen reader reads title, subtitle and badge as one item. */
export const ListItem = ({
  title,
  subtitle,
  details = [],
  meta,
  badge,
  leading,
  onPress,
  divider = true,
}: ListItemProps) => {
  const theme = useTheme();
  // With a large system font the badge goes below the texts instead of squeezing them.
  const stacked = useWindowDimensions().fontScale >= STACK_FONT_SCALE;
  const badges = badge === undefined ? [] : Array.isArray(badge) ? badge : [badge];
  const label = [title, subtitle, ...details, meta, ...badges.map(badgeLabel)]
    .filter(Boolean)
    .join(', ');

  const content = (
    <>
      {leading}
      <View
        style={[
          styles.body,
          divider && { borderBottomWidth: 1, borderBottomColor: theme.colors.contornoSuave },
        ]}
      >
        <View style={stacked ? styles.mainStacked : styles.main}>
          <View style={[styles.texts, !stacked && styles.fill]}>
            <Text variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant={theme.scale === 'admin' ? 'adminCorpo' : 'pessoaApoio'}
                color="textoApoio"
              >
                {subtitle}
              </Text>
            ) : null}
            {details.map((line) => (
              <Text
                key={line}
                variant={theme.scale === 'admin' ? 'adminApoio' : 'pessoaApoio'}
                color="textoApoio"
              >
                {line}
              </Text>
            ))}
            {meta ? (
              <Text
                variant={theme.scale === 'admin' ? 'adminApoio' : 'pessoaApoio'}
                color="textoApoio"
                style={{ fontFamily: theme.fontFamily.bold }}
              >
                {meta}
              </Text>
            ) : null}
          </View>
          {badges.length > 0 ? (
            <View style={stacked ? styles.badgesRow : styles.badgesColumn}>
              {badges.map((item) => (
                <StatusBadge key={badgeLabel(item)} {...item} />
              ))}
            </View>
          ) : null}
        </View>
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
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mainStacked: { flex: 1, alignItems: 'flex-start', gap: 6 },
  texts: { gap: 2 },
  // Beside the texts the badges pile up, leaving the width to the e-mail; below them, side by side.
  badgesColumn: { alignItems: 'flex-end', gap: 6 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fill: { flex: 1 },
  pressed: { opacity: 0.7 },
});
