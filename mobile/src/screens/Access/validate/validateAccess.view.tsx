import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { SpinningCookie } from '@/components/shapes';
import { Button, Text } from '@/components/ui';
import { useAnnounce } from '@/components/ui/useAnnounce';
import { colors, screenMargin } from '@/theme';
import { MessageScreen } from '../MessageScreen';
import { ResultScreen } from './ResultScreen';
import type { useValidateAccessModel } from './validateAccess.model';

type ValidateAccessViewProps = ReturnType<typeof useValidateAccessModel> & {
  onBack: () => void;
  onDone: () => void;
  onReadAgain: () => void;
  onSeeAuthorizations: () => void;
};

const WHY_LOCATION = 'Precisamos da sua localização para confirmar que você está perto da catraca.';

type ProgressProps = { validating: boolean; located: boolean };

// T09: there is no cancel button. Only says the location was confirmed when there is a position.
const Progress = ({ validating, located }: ProgressProps) => {
  const title = validating ? 'Validando seu acesso…' : 'Verificando sua localização…';
  useAnnounce(title);

  return (
    <SafeAreaView style={styles.progress}>
      <View style={styles.progressContent}>
        <SpinningCookie color={colors.primaria} size={88} />
        <Text variant="pessoaTitulo" accessibilityRole="header" accessibilityLiveRegion="polite">
          {title}
        </Text>
        {located ? (
          <View style={styles.step}>
            <Icon name="check_circle" color={colors.sucesso} />
            <Text variant="pessoaApoio">Localização confirmada</Text>
          </View>
        ) : null}
        {validating ? (
          <View style={styles.step}>
            <Icon name="progress_activity" color={colors.primaria} />
            <Text variant="pessoaApoio">Conferindo sua autorização</Text>
          </View>
        ) : null}
      </View>
      <Text variant="pessoaApoio" style={styles.hint}>
        Mantenha o celular perto da catraca.
      </Text>
    </SafeAreaView>
  );
};

export const ValidateAccessView = ({
  stage,
  located,
  result,
  onAllow,
  onOpenSettings,
  onBack,
  onDone,
  onReadAgain,
  onSeeAuthorizations,
}: ValidateAccessViewProps) => {
  if (stage === 'checking') return <View style={styles.progress} />;

  if (stage === 'ask') {
    return (
      <MessageScreen
        icon="location_on"
        title={WHY_LOCATION}
        footer={
          <>
            <Button label="Permitir localização" onPress={onAllow} />
            <Button variant="texto" label="Agora não" onPress={onBack} />
          </>
        }
      />
    );
  }

  if (stage === 'denied') {
    return (
      <MessageScreen
        icon="location_off"
        title={WHY_LOCATION}
        footer={
          <>
            <Button label="Abrir configurações" onPress={onOpenSettings} />
            <Button variant="texto" label="Voltar" onPress={onBack} />
          </>
        }
      />
    );
  }

  if (result) {
    return (
      <ResultScreen
        result={result}
        onDone={onDone}
        onReadAgain={onReadAgain}
        onSeeAuthorizations={onSeeAuthorizations}
      />
    );
  }

  return <Progress validating={stage === 'validating'} located={located} />;
};

const styles = StyleSheet.create({
  progress: { flex: 1, backgroundColor: colors.fundo },
  progressContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: screenMargin,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { paddingHorizontal: screenMargin, paddingBottom: 24 },
});
