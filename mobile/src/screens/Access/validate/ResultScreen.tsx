import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { Button, type ButtonVariant, Text } from '@/components/ui';
import { useAnnounce } from '@/components/ui/useAnnounce';
import { inSaoPaulo } from '@/lib/dateValue';
import type { DenialAction } from '@/lib/denialReasons';
import { entriesLeft } from '@/lib/entriesLeft';
import { colors, screenMargin, useReducedMotion, type ColorName } from '@/theme';
import { resultContent, type ResultTone } from './resultContent';
import type { AccessResult } from './validateAccess.model';

type TonePalette = {
  background: ColorName;
  statusBar: StatusBarStyle;
  text: ColorName;
  line: ColorName;
  seal: ColorName;
  sealIcon: ColorName;
  primary: ButtonVariant;
  /** "Voltar ao início"; the T10 has only one button. */
  secondary?: ButtonVariant;
};

// T10 and T11 (tokens.md, "Cores de cada tipo de botão").
const palettes: Record<ResultTone, TonePalette> = {
  autorizado: {
    background: 'resultadoAutorizado',
    statusBar: 'light',
    text: 'branco',
    line: 'linhaAutorizado',
    seal: 'branco',
    sealIcon: 'resultadoAutorizado',
    primary: 'resultadoAutorizado',
  },
  tente: {
    background: 'resultadoTente',
    statusBar: 'dark',
    text: 'acaoSobre',
    line: 'linhaTente',
    seal: 'acaoSobre',
    sealIcon: 'resultadoTente',
    primary: 'resultadoTente',
    secondary: 'resultadoTenteContorno',
  },
  negado: {
    background: 'resultadoNegado',
    statusBar: 'light',
    text: 'branco',
    line: 'linhaNegado',
    seal: 'branco',
    sealIcon: 'resultadoNegado',
    primary: 'resultadoNegado',
    secondary: 'resultadoNegadoContorno',
  },
};

const actionLabels: Record<DenialAction, string> = {
  lerOutro: 'Ler outro QR Code',
  tentarDeNovo: 'Tentar de novo',
  minhasAutorizacoes: 'Ver minhas autorizações',
};

const ENTRANCE_MS = 600;
const SEAL_SIZE = 120;

// tokens.md, "Movimento": the seal springs in about 0.6 s and the text shows in 0.3 s.
const useEntrance = () => {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const entrance = Animated.timing(progress, {
      toValue: 1,
      duration: ENTRANCE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [reducedMotion, progress]);

  return useMemo(
    () => ({
      seal: {
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 0.5, 0.8, 1],
              outputRange: [0.55, 1.08, 0.97, 1],
            }),
          },
          { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) },
        ],
      },
      text: {
        opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
      },
    }),
    [progress],
  );
};

type DetailRowProps = { label: string; value: string; line: ColorName };

const DetailRow = ({ label, value, line }: DetailRowProps) => (
  <View style={[styles.detail, { borderTopColor: colors[line] }]}>
    <Text variant="pessoaApoio" color="branco" style={styles.detailLabel}>
      {label}
    </Text>
    <Text variant="pessoaCorpoForte" color="branco" style={styles.detailValue}>
      {value}
    </Text>
  </View>
);

type ResultScreenProps = {
  result: AccessResult;
  onDone: () => void;
  onReadAgain: () => void;
  onSeeAuthorizations: () => void;
};

// T10 and T11: a full color, a big title and thin lines. The color is never the only cue.
export const ResultScreen = ({
  result,
  onDone,
  onReadAgain,
  onSeeAuthorizations,
}: ResultScreenProps) => {
  const { tone, icon, title, message, action } = resultContent(result);
  const palette = palettes[tone];
  const entrance = useEntrance();
  useAnnounce(`${title}. ${message}`);

  return (
    <SafeAreaView
      testID="result-screen"
      style={[styles.screen, { backgroundColor: colors[palette.background] }]}
    >
      <StatusBar style={palette.statusBar} />
      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.message}
        >
          <Animated.View style={entrance.seal}>
            <Cookie12 color={colors[palette.seal]} size={SEAL_SIZE}>
              <Icon testID="result-icon" name={icon} size={56} color={colors[palette.sealIcon]} />
            </Cookie12>
          </Animated.View>
          <Animated.View testID="result-text" style={[styles.texts, entrance.text]}>
            <Text variant="pessoaResultado" color={palette.text}>
              {title}
            </Text>
            <Text variant="pessoaCorpo" color={palette.text}>
              {message}
            </Text>
          </Animated.View>
        </View>

        {result.tipo === 'AUTORIZADO' ? (
          <View style={styles.details}>
            <DetailRow
              label={result.local}
              value={entriesLeft(result.usosRestantes)}
              line={palette.line}
            />
            <DetailRow
              label="Hoje"
              value={inSaoPaulo(new Date(result.ocorridoEm)).time}
              line={palette.line}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {action === null ? (
          <Button variant={palette.primary} label="Concluir" onPress={onDone} />
        ) : (
          <>
            <Button
              variant={palette.primary}
              label={actionLabels[action]}
              onPress={action === 'minhasAutorizacoes' ? onSeeAuthorizations : onReadAgain}
            />
            <Button variant={palette.secondary} label="Voltar ao início" onPress={onDone} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 24,
    paddingHorizontal: screenMargin,
    paddingTop: 48,
    paddingBottom: 16,
  },
  message: { gap: 24 },
  texts: { gap: 12 },
  details: { gap: 0 },
  detail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { flexShrink: 1 },
  detailValue: { flexShrink: 1 },
  footer: { gap: 12, paddingHorizontal: screenMargin, paddingBottom: 16 },
});
