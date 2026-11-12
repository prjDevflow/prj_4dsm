import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { Text } from '@/components/ui';
import { accessReasonLabel, formatEventTime, metodoIcons, metodoLabels } from '@/lib/accessEvents';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import { useTheme } from '@/theme';

type AccessEventRowProps = {
  event: EventoDeAcesso;
  /** The admin reads who tried (T26); the person reads where (T12). */
  perspective: 'admin' | 'pessoa';
  onPress?: () => void;
};

// From this system font size on, the time goes below the name instead of squeezing it.
const STACK_FONT_SCALE = 1.3;

const UNKNOWN_PERSON = 'Não identificado';
const UNKNOWN_PLACE = 'Local não identificado';

/** The texts of one attempt, in reading order; the screen reader reads them as one item. */
export const accessEventTexts = (event: EventoDeAcesso, perspective: 'admin' | 'pessoa') => {
  const place = event.local?.nome ?? UNKNOWN_PLACE;
  const denied = event.resultado === 'NEGADO';
  return {
    title: perspective === 'admin' ? (event.usuario?.nome ?? UNKNOWN_PERSON) : place,
    place: perspective === 'admin' ? place : null,
    metodo: metodoLabels[event.metodo],
    time: formatEventTime(event.ocorridoEm),
    result: denied ? 'Negado' : 'Autorizado',
    reason: denied ? accessReasonLabel(event.motivo) : null,
  };
};

// T26 and T12 (Figma "Passe"): result seal, who or where, method with icon, time and the reason.
export const AccessEventRow = ({ event, perspective, onPress }: AccessEventRowProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const admin = theme.scale === 'admin';
  const stacked = useWindowDimensions().fontScale >= STACK_FONT_SCALE;
  const texts = accessEventTexts(event, perspective);
  const denied = event.resultado === 'NEGADO';
  const label = [texts.title, texts.place, texts.metodo, texts.time, texts.result, texts.reason]
    .filter(Boolean)
    .join(', ');

  const content = (
    <>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Cookie12 color={denied ? colors.erro : colors.sucesso} size={admin ? 36 : 44}>
          <Icon
            name={denied ? 'close' : 'check'}
            size={admin ? 20 : 24}
            color={denied ? colors.erroSobre : colors.sucessoSobre}
          />
        </Cookie12>
      </View>
      <View style={[styles.body, { borderBottomColor: colors.contornoSuave }]}>
        <View testID="access-event-top" style={stacked ? styles.topStacked : styles.top}>
          <Text variant={admin ? 'adminItem' : 'pessoaCorpoForte'} style={!stacked && styles.fill}>
            {texts.title}
          </Text>
          <Text
            variant={admin ? 'adminApoio' : 'pessoaApoio'}
            color="textoApoio"
            style={styles.time}
          >
            {texts.time}
          </Text>
        </View>
        <View style={styles.metodo}>
          <Icon
            testID="metodo-icon"
            name={metodoIcons[event.metodo]}
            size={admin ? 16 : 18}
            color={colors.textoApoio}
          />
          <Text
            variant={admin ? 'adminCorpo' : 'pessoaApoio'}
            color="textoApoio"
            style={styles.fill}
          >
            {texts.place ? `${texts.place}, ${texts.metodo}` : texts.metodo}
          </Text>
        </View>
        {texts.reason ? (
          <Text
            variant={admin ? 'adminApoio' : 'pessoaApoio'}
            color="erro"
            style={{ fontFamily: theme.fontFamily.bold }}
          >
            {texts.reason}
          </Text>
        ) : null}
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingTop: 12 },
  body: { flex: 1, gap: 4, paddingBottom: 12, borderBottomWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  topStacked: { flexDirection: 'column', gap: 2 },
  metodo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontVariant: ['tabular-nums'] },
  fill: { flexShrink: 1, flexGrow: 1 },
  pressed: { opacity: 0.7 },
});
