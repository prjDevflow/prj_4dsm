import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme, type ColorName } from '@/theme';
import { Text } from './Text';
import { useAnnounce } from './useAnnounce';

export type AlertTone = 'info' | 'aviso' | 'erro' | 'sucesso';

const tones: Record<AlertTone, { background: ColorName; text: ColorName; icon: IconName }> = {
  info: { background: 'primariaContainer', text: 'primariaContainerSobre', icon: 'info' },
  aviso: { background: 'aviso', text: 'acaoSobre', icon: 'warning' },
  erro: { background: 'erroContainer', text: 'erroContainerSobre', icon: 'error' },
  sucesso: { background: 'sucessoContainer', text: 'sucessoContainerSobre', icon: 'check_circle' },
};

type AlertProps = {
  tone: AlertTone;
  message: string;
  title?: string;
  /** Replaces the tone icon ("lock_clock" for the expired session, for example). */
  icon?: IconName;
};

/** Warning or error strip, announced by the screen reader as soon as it appears. */
export const Alert = ({ tone, message, title, icon }: AlertProps) => {
  const theme = useTheme();
  const colors = tones[tone];
  useAnnounce(message);

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.box,
        { backgroundColor: theme.colors[colors.background], borderRadius: theme.radius.alerta },
      ]}
    >
      <Icon name={icon ?? colors.icon} color={theme.colors[colors.text]} />
      <View style={styles.texts}>
        {title ? (
          <Text
            variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}
            color={colors.text}
          >
            {title}
          </Text>
        ) : null}
        <Text color={colors.text}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  texts: { flex: 1, gap: 4 },
});
