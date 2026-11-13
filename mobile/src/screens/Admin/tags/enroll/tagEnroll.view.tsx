import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import {
  Alert,
  Button,
  Header,
  ProgressBar,
  ScreenContainer,
  SelectField,
  Text,
} from '@/components/ui';
import { ThemeProvider, useTheme } from '@/theme';
import { ENROLL_SECONDS, type useTagEnrollModel } from './tagEnroll.model';

type TagEnrollViewProps = ReturnType<typeof useTagEnrollModel> & {
  onBack: () => void;
  /** After the tag was linked: back to the list. */
  onDone: () => void;
};

// T30 Ler tag no terminal (Figma "Passe").
export const TagEnrollView = ({
  stage,
  terminalId,
  remaining,
  errorMessage,
  message,
  terminalOptions,
  onChooseTerminal,
  onTryAgain,
  onBack,
  onDone,
}: TagEnrollViewProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const busy = stage === 'starting' || stage === 'waiting';

  const footer =
    stage === 'linked' ? (
      <Button label="Concluir" onPress={onDone} />
    ) : stage === 'expired' ? (
      <>
        <Button label="Tentar de novo" onPress={onTryAgain} />
        <Button variant="contorno" label="Voltar" onPress={onBack} />
      </>
    ) : (
      <Button variant="contorno" label="Cancelar" onPress={onBack} />
    );

  return (
    <ThemeProvider scale="admin">
      <ScreenContainer
        header={<Header title="Ler tag no terminal" onBack={onBack} />}
        footer={footer}
        contentStyle={styles.content}
      >
        <SelectField
          label="Terminal"
          options={terminalOptions}
          value={terminalId}
          onChange={onChooseTerminal}
          placeholder="Escolha o terminal"
          disabled={busy}
        />
        {errorMessage ? <Alert tone="erro" message={errorMessage} /> : null}

        {stage === 'choosing' && !errorMessage ? (
          <Text variant="adminCorpo" color="textoApoio">
            Escolha o terminal onde a tag vai ser lida. Ele espera a tag por 60 s.
          </Text>
        ) : null}

        {stage === 'waiting' || stage === 'starting' ? (
          <View style={styles.center} accessibilityLiveRegion="polite">
            <Cookie12 color={colors.areaTagsSobre} size={120}>
              <Icon name="contactless" size={56} color={colors.areaTags} />
            </Cookie12>
            <Text variant="adminTitulo" style={styles.centerText}>
              Aproxime a tag do terminal…
            </Text>
            {stage === 'waiting' ? (
              <View style={styles.countdown}>
                <Text variant="adminApoio">{`Faltam ${remaining} s`}</Text>
                <ProgressBar
                  value={remaining}
                  total={ENROLL_SECONDS}
                  accessibilityLabel={`Faltam ${remaining} segundos`}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {stage === 'linked' || stage === 'expired' ? (
          <View style={styles.center} accessibilityLiveRegion="polite">
            <Cookie12
              color={stage === 'linked' ? colors.sucesso : colors.superficieMaxima}
              size={120}
            >
              <Icon
                name={stage === 'linked' ? 'check' : 'timer_off'}
                size={56}
                color={stage === 'linked' ? colors.sucessoSobre : colors.textoApoio}
              />
            </Cookie12>
            <Text variant="adminTitulo" style={styles.centerText}>
              {message}
            </Text>
          </View>
        ) : null}
      </ScreenContainer>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  content: { gap: 20 },
  center: { alignItems: 'center', gap: 20, paddingTop: 24 },
  centerText: { textAlign: 'center' },
  countdown: { alignSelf: 'stretch', gap: 8 },
});
