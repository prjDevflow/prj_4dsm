import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { useHealthModel } from './health.model';

type HealthViewProps = ReturnType<typeof useHealthModel>;

// Provisional screen (F01): the theme and the ui components arrive in F02 (tokens.md).
const colors = {
  fundo: '#121318',
  superficie: '#1E1F25',
  texto: '#E3E1E9',
  textoApoio: '#C6C5D0',
  primaria: '#B5C4FF',
  primariaSobre: '#0F2B76',
  sucesso: '#8BD8A2',
  erro: '#FFB4AB',
};

export const HealthView = ({
  apiUrl,
  status,
  title,
  detail,
  isRetrying,
  onRetry,
}: HealthViewProps) => (
  <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.appName}>
        Passe
      </Text>

      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text
          style={[
            styles.title,
            status === 'ok' && { color: colors.sucesso },
            status === 'down' && { color: colors.erro },
          ]}
        >
          {title}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <Text style={styles.label}>Endereço da API</Text>
        <Text style={styles.url} selectable>
          {apiUrl}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRetrying ? 'Verificando…' : 'Tentar novamente'}
        accessibilityState={{ busy: isRetrying, disabled: isRetrying }}
        disabled={isRetrying}
        onPress={onRetry}
        style={({ pressed }) => [styles.button, (pressed || isRetrying) && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{isRetrying ? 'Verificando…' : 'Tentar novamente'}</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.fundo },
  content: { flexGrow: 1, justifyContent: 'center', padding: 16, gap: 24 },
  appName: { color: colors.primaria, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  card: { backgroundColor: colors.superficie, borderRadius: 20, padding: 24, gap: 8 },
  title: { color: colors.texto, fontSize: 24, fontWeight: '700' },
  detail: { color: colors.texto, fontSize: 18, lineHeight: 24 },
  label: { color: colors.textoApoio, fontSize: 14, marginTop: 8 },
  url: { color: colors.textoApoio, fontSize: 16 },
  button: {
    minHeight: 60,
    borderRadius: 999,
    backgroundColor: colors.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.primariaSobre, fontSize: 20, fontWeight: '700' },
});
