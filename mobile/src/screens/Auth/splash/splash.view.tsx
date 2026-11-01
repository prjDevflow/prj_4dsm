import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { ErrorState, LoadingState, ScreenContainer, Text } from '@/components/ui';
import { colors } from '@/theme';
import type { useSplashModel } from './splash.model';

type SplashViewProps = ReturnType<typeof useSplashModel>;

// T01 Abertura (Figma "Passe").
export const SplashView = ({ status, errorMessage, onRetry }: SplashViewProps) => (
  <ScreenContainer contentStyle={styles.content}>
    <View style={styles.brand}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Cookie12 color={colors.primaria} size={128}>
          <Icon name="check" size={60} color={colors.primariaSobre} />
        </Cookie12>
      </View>
      <Text variant="pessoaResultado">Passe</Text>
      <Text variant="pessoaApoio" color="textoApoio">
        Controle de Acesso
      </Text>
    </View>

    <View style={styles.bottom}>
      {status === 'error' ? (
        <ErrorState icon="wifi_off" tone="neutro" title={errorMessage ?? ''} onRetry={onRetry} />
      ) : (
        <LoadingState />
      )}
    </View>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  brand: { flex: 1, justifyContent: 'center', gap: 8 },
  bottom: { paddingBottom: 8 },
});
