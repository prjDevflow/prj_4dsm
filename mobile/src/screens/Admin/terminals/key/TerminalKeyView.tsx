import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Header, ScreenContainer, Text, TextField } from '@/components/ui';
import { ThemeProvider, useTheme } from '@/theme';
import type { IssuedKey } from './useIssuedKey';

type TerminalKeyViewProps = IssuedKey & {
  onCopy: () => unknown;
  onDone: () => void;
};

const Warning = () => {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="alert"
      style={[
        styles.warning,
        { backgroundColor: theme.colors.aviso, borderRadius: theme.radius.cartaoGrande },
      ]}
    >
      <Icon name="key" size={28} color={theme.colors.acaoSobre} />
      <Text variant="pessoaDestaque" color="acaoSobre">
        Anote esta chave agora. Ela não será mostrada de novo.
      </Text>
    </View>
  );
};

// T22 Chave do terminal: shown once, after creating the terminal or generating a new key.
export const TerminalKeyView = ({ terminalName, apiKey, onCopy, onDone }: TerminalKeyViewProps) => {
  // No way back by accident: only "Concluir" leaves, and the key goes away with the screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider scale="admin">
      <ScreenContainer
        header={<Header title="Chave do terminal" />}
        footer={
          <>
            <Button label="Copiar chave" icon="content_copy" onPress={onCopy} />
            <Button variant="contorno" label="Concluir" onPress={onDone} />
          </>
        }
        contentStyle={styles.content}
      >
        <Warning />
        <TextField
          label={`Chave do ${terminalName}`}
          value={apiKey}
          readOnly
          multiline
          selectTextOnFocus
          help="Digite esta chave na configuração do terminal da catraca."
        />
      </ScreenContainer>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  content: { gap: 20 },
  warning: { gap: 12, padding: 20 },
});
