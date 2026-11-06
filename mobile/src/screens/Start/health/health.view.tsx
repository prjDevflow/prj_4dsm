import { StyleSheet, View } from 'react-native';
import { Button, Card, ScreenContainer, Text } from '@/components/ui';
import type { useHealthModel } from './health.model';

type HealthViewProps = ReturnType<typeof useHealthModel>;

// Provisional home (F01) until the real home arrives in F04.
export const HealthView = ({
  apiUrl,
  status,
  title,
  detail,
  isRetrying,
  onRetry,
  showCatalog,
  onOpenCatalog,
}: HealthViewProps) => (
  <ScreenContainer contentStyle={styles.content}>
    <Text
      variant="pessoaResultado"
      color="primaria"
      accessibilityRole="header"
      style={styles.center}
    >
      Passe
    </Text>

    <Card accessibilityLiveRegion="polite">
      <Text
        variant="pessoaDestaque"
        color={status === 'ok' ? 'sucesso' : status === 'down' ? 'erro' : 'texto'}
      >
        {title}
      </Text>
      {detail ? <Text>{detail}</Text> : null}
      <View>
        <Text variant="pessoaApoio" color="textoApoio">
          Endereço da API
        </Text>
        <Text variant="pessoaApoio" color="textoApoio" selectable>
          {apiUrl}
        </Text>
      </View>
    </Card>

    <Button
      label="Tentar novamente"
      loadingLabel="Verificando…"
      loading={isRetrying}
      onPress={onRetry}
    />
    {showCatalog ? (
      <Button variant="texto" label="Abrir catálogo de componentes" onPress={onOpenCatalog} />
    ) : null}
  </ScreenContainer>
);

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: 24 },
  center: { textAlign: 'center' },
});
