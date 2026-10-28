import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Cookie12, SpinningCookie } from '@/components/shapes';
import { useTheme, type ColorName } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

// Shared states of T31: loading, empty, error (and timeout or permission denied) and offline.

type LoadingStateProps = { label?: string };

export const LoadingState = ({ label = 'Carregando…' }: LoadingStateProps) => {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.loading}
    >
      <SpinningCookie color={colors.primaria} size={56} />
      <Text variant="pessoaCorpo" style={styles.shrink}>
        {label}
      </Text>
    </View>
  );
};

type StateTone = 'neutro' | 'erro' | 'primario';

const stateTones: Record<StateTone, { shape: ColorName; icon: ColorName }> = {
  neutro: { shape: 'superficieAlta', icon: 'textoApoio' },
  erro: { shape: 'erroContainer', icon: 'erroContainerSobre' },
  primario: { shape: 'primariaContainer', icon: 'primariaContainerSobre' },
};

type StateAction = { label: string; onPress: () => void };

type StateLayoutProps = {
  icon: IconName;
  tone: StateTone;
  title: string;
  message?: string;
  action?: StateAction & { variant: 'principal' | 'tonal' };
};

const StateLayout = ({ icon, tone, title, message, action }: StateLayoutProps) => {
  const { colors } = useTheme();
  const toneColors = stateTones[tone];

  return (
    <View style={styles.state}>
      <Cookie12 color={colors[toneColors.shape]} size={88}>
        <Icon name={icon} size={40} color={colors[toneColors.icon]} />
      </Cookie12>
      <Text variant="pessoaDestaque" accessibilityRole="header" accessibilityLiveRegion="polite">
        {title}
      </Text>
      {message ? <Text color="textoApoio">{message}</Text> : null}
      {action ? (
        <Button
          variant={action.variant}
          label={action.label}
          onPress={action.onPress}
          fullWidth={false}
        />
      ) : null}
    </View>
  );
};

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message?: string;
  action?: StateAction;
};

export const EmptyState = ({ icon, title, message, action }: EmptyStateProps) => (
  <StateLayout
    icon={icon}
    tone="neutro"
    title={title}
    message={message}
    action={action && { ...action, variant: 'tonal' }}
  />
);

type ErrorStateProps = {
  onRetry: () => void;
  title?: string;
  message?: string;
  /** "hourglass_disabled" for timeout, "no_photography" for permission denied... */
  icon?: IconName;
  /** "neutro" for timeout, "primario" for permission denied. */
  tone?: StateTone;
  retryLabel?: string;
};

export const ErrorState = ({
  onRetry,
  title = 'Não foi possível carregar.',
  message,
  icon = 'error',
  tone = 'erro',
  retryLabel = 'Tentar novamente',
}: ErrorStateProps) => (
  <StateLayout
    icon={icon}
    tone={tone}
    title={title}
    message={message}
    action={{ label: retryLabel, onPress: onRetry, variant: 'principal' }}
  />
);

type OfflineBannerProps = { onRetry?: () => void; message?: string };

/** Fixed strip on screens that depend on the network. */
export const OfflineBanner = ({ onRetry, message = 'Sem internet' }: OfflineBannerProps) => {
  const theme = useTheme();

  return (
    <View
      testID="offline-banner"
      style={[
        styles.banner,
        { backgroundColor: theme.colors.aviso, borderRadius: theme.radius.alerta },
      ]}
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.bannerMessage}
      >
        <Icon name="wifi_off" color={theme.colors.acaoSobre} />
        <Text variant="pessoaCorpoForte" color="acaoSobre" style={styles.shrink}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.bannerAction,
            { minHeight: theme.sizes.touchMin },
            pressed && styles.pressed,
          ]}
        >
          <Text variant="adminBotao" color="acaoSobre">
            Tentar novamente
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 24 },
  shrink: { flexShrink: 1 },
  state: { alignItems: 'flex-start', gap: 16, paddingVertical: 24 },
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerMessage: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  bannerAction: { justifyContent: 'center', paddingHorizontal: 8 },
  pressed: { opacity: 0.7 },
});
