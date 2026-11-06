import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { useTheme, type ColorName } from '@/theme';
import { Text } from './Text';

export type BadgeTone = 'sucesso' | 'erro' | 'neutro' | 'aviso' | 'primario';

/** Effective status of an authorization, terminal or user status, and access result. */
export type BadgeStatus =
  | 'ATIVA'
  | 'CANCELADA'
  | 'EXPIRADA'
  | 'ESGOTADA'
  | 'ONLINE'
  | 'OFFLINE'
  | 'INATIVO'
  | 'AUTORIZADO'
  | 'NEGADO';

type ResultStatus = Extract<BadgeStatus, 'AUTORIZADO' | 'NEGADO'>;

const tones: Record<BadgeTone, { background: ColorName; text: ColorName }> = {
  sucesso: { background: 'sucessoContainer', text: 'sucessoContainerSobre' },
  erro: { background: 'erroContainer', text: 'erroContainerSobre' },
  neutro: { background: 'superficieMaxima', text: 'textoApoio' },
  aviso: { background: 'aviso', text: 'acaoSobre' },
  primario: { background: 'primariaContainer', text: 'primariaContainerSobre' },
};

const pills: Record<Exclude<BadgeStatus, ResultStatus>, { label: string; tone: BadgeTone }> = {
  ATIVA: { label: 'Ativa', tone: 'sucesso' },
  CANCELADA: { label: 'Cancelada', tone: 'erro' },
  EXPIRADA: { label: 'Expirada', tone: 'neutro' },
  ESGOTADA: { label: 'Esgotada', tone: 'neutro' },
  ONLINE: { label: 'Online', tone: 'sucesso' },
  OFFLINE: { label: 'Offline', tone: 'aviso' },
  INATIVO: { label: 'Inativo', tone: 'neutro' },
};

// T31: the access result is a cookie with check or X next to the text.
const results: Record<
  ResultStatus,
  { label: string; cookie: ColorName; icon: IconName; iconColor: ColorName }
> = {
  AUTORIZADO: { label: 'Autorizado', cookie: 'sucesso', icon: 'check', iconColor: 'sucessoSobre' },
  NEGADO: { label: 'Negado', cookie: 'erro', icon: 'close', iconColor: 'erroSobre' },
};

export type StatusBadgeProps = { status: BadgeStatus } | { tone: BadgeTone; label: string };

const isResult = (status: BadgeStatus): status is ResultStatus => status in results;

/** Text the badge shows (used by ListItem to build the screen reader label). */
export const badgeLabel = (props: StatusBadgeProps) =>
  'status' in props
    ? isResult(props.status)
      ? results[props.status].label
      : pills[props.status].label
    : props.label;

/** Always text and color, never color alone. */
export const StatusBadge = (props: StatusBadgeProps) => {
  const theme = useTheme();

  const status = 'status' in props ? props.status : null;

  if (status && isResult(status)) {
    const result = results[status];
    return (
      <View style={styles.result}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Cookie12 testID="status-cookie" color={theme.colors[result.cookie]} size={32}>
            <Icon
              testID="status-icon"
              name={result.icon}
              size={18}
              color={theme.colors[result.iconColor]}
            />
          </Cookie12>
        </View>
        <Text variant={theme.scale === 'admin' ? 'adminCorpo' : 'pessoaCorpo'}>{result.label}</Text>
      </View>
    );
  }

  const { label, tone } = status ? pills[status] : (props as { tone: BadgeTone; label: string });
  const colors = tones[tone];

  return (
    <View
      testID="status-badge"
      style={[
        styles.pill,
        {
          backgroundColor: theme.colors[colors.background],
          borderRadius: theme.radius.selo,
          minHeight: theme.sizes.badge,
        },
      ]}
    >
      <Text variant="adminSelo" color={colors.text}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
