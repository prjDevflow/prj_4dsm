import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  Header,
  ScreenContainer,
  StatusBadge,
  SwitchField,
  Text,
  TextField,
} from '@/components/ui';
import { DiscardDialog, FormFooter } from '@/screens/Shared/form/FormFooter';
import { FormLoadState } from '@/screens/Shared/form/FormLoadState';
import { ThemeProvider, useTheme } from '@/theme';
import { TerminalKeyView } from '../key/TerminalKeyView';
import type { useTerminalDetailModel } from './terminalDetail.model';

type TerminalDetailViewProps = ReturnType<typeof useTerminalDetailModel>;

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.contornoSuave }]} />;
};

// T21 Terminal (detail) and T22 after "Gerar nova chave" (Figma "Passe").
export const TerminalDetailView = ({
  form,
  status,
  title,
  badge,
  seen,
  position,
  place,
  loadErrorMessage,
  onRetryLoad,
  onSubmit,
  isSaving,
  apiError,
  rotateDialogVisible,
  rotating,
  onRequestRotate,
  onCancelRotate,
  onConfirmRotate,
  issuedKey,
  onCopyKey,
  onDone,
  discardDialogVisible,
  onCancel,
  onKeepEditing,
  onDiscard,
}: TerminalDetailViewProps) => {
  if (issuedKey) return <TerminalKeyView {...issuedKey} onCopy={onCopyKey} onDone={onDone} />;

  const header = <Header title={title} onBack={onCancel} />;

  if (status !== 'ready') {
    return (
      <ThemeProvider scale="admin">
        <ScreenContainer header={header}>
          <FormLoadState
            status={status}
            loadingLabel="Carregando terminal…"
            notFoundTitle="Terminal não encontrado."
            errorTitle="Não foi possível carregar o terminal."
            errorMessage={loadErrorMessage}
            onRetry={onRetryLoad}
            onBack={onCancel}
          />
        </ScreenContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider scale="admin">
      <ScreenContainer
        header={header}
        footer={
          <FormFooter
            apiError={apiError}
            isSaving={isSaving}
            onCancel={onCancel}
            onSave={onSubmit}
          />
        }
        contentStyle={styles.content}
      >
        <Card tone="alta" style={styles.summary}>
          <View style={styles.statusRow}>
            {badge ? <StatusBadge {...badge} /> : null}
            <Text variant="adminApoio" color="textoApoio" style={styles.fill}>
              {seen}
            </Text>
          </View>
          <View>
            <Text variant="adminApoio" color="textoApoio">
              Local
            </Text>
            <Text variant="adminItem">{place}</Text>
          </View>
          {position ? (
            <View>
              <Text variant="adminApoio" color="textoApoio">
                Última posição
              </Text>
              <Text variant="adminItem">{position}</Text>
            </View>
          ) : null}
        </Card>

        <Controller
          control={form.control}
          name="nome"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              maxLength={120}
            />
          )}
        />
        <Controller
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <SwitchField
              label="Ativo"
              help="Inativo, o terminal não libera ninguém."
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        <Divider />
        <View style={styles.keySection}>
          <Text variant="adminRotulo">Chave do terminal</Text>
          <Text variant="adminApoio" color="textoApoio">
            A chave só aparece quando é gerada. Se ela se perdeu, gere uma nova.
          </Text>
          <Button variant="perigoContorno" label="Gerar nova chave" onPress={onRequestRotate} />
        </View>
      </ScreenContainer>

      <Dialog
        visible={rotateDialogVisible}
        title="Gerar nova chave?"
        message="A chave antiga deixará de funcionar. Continuar?"
        confirmLabel="Gerar nova chave"
        confirmLoading={rotating}
        confirmLoadingLabel="Gerando…"
        destructive
        onConfirm={onConfirmRotate}
        onCancel={onCancelRotate}
      />
      <DiscardDialog
        visible={discardDialogVisible}
        onKeepEditing={onKeepEditing}
        onDiscard={onDiscard}
      />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: 20 },
  summary: { gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1 },
  keySection: { gap: 12 },
});
