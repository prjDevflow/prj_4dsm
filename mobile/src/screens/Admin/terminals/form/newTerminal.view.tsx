import { Controller } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { Alert, Header, ScreenContainer, SelectField, TextField } from '@/components/ui';
import { DiscardDialog, FormFooter } from '@/screens/Shared/form/FormFooter';
import { FormLoadState } from '@/screens/Shared/form/FormLoadState';
import { ThemeProvider } from '@/theme';
import { TerminalKeyView } from '../key/TerminalKeyView';
import type { useNewTerminalModel } from './newTerminal.model';

type NewTerminalViewProps = ReturnType<typeof useNewTerminalModel>;

// T21 Novo terminal, then T22 with its key (Figma "Passe").
export const NewTerminalView = ({
  form,
  status,
  loadErrorMessage,
  onRetryLoad,
  accessPointOptions,
  onSubmit,
  isSaving,
  apiError,
  issuedKey,
  onCopyKey,
  onDone,
  discardDialogVisible,
  onCancel,
  onKeepEditing,
  onDiscard,
}: NewTerminalViewProps) => {
  if (issuedKey) return <TerminalKeyView {...issuedKey} onCopy={onCopyKey} onDone={onDone} />;

  const header = <Header title="Novo terminal" onBack={onCancel} />;

  if (status !== 'ready') {
    return (
      <ThemeProvider scale="admin">
        <ScreenContainer header={header}>
          <FormLoadState
            status={status}
            loadingLabel="Carregando locais…"
            notFoundTitle=""
            errorTitle="Não foi possível carregar os locais."
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
        <Controller
          control={form.control}
          name="nome"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Nome"
              placeholder="Terminal Social"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              maxLength={120}
              returnKeyType="next"
              submitBehavior="blurAndSubmit"
            />
          )}
        />
        <Controller
          control={form.control}
          name="accessPointId"
          render={({ field, fieldState }) => (
            <SelectField
              label="Ponto de acesso"
              options={accessPointOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              help="Cada local tem um terminal só."
              searchable={accessPointOptions.length > 6}
            />
          )}
        />
        {accessPointOptions.length === 0 ? (
          <Alert
            tone="info"
            message="Todos os locais ativos já têm terminal. Cadastre um local novo antes."
          />
        ) : null}
      </ScreenContainer>
      <DiscardDialog
        visible={discardDialogVisible}
        onKeepEditing={onKeepEditing}
        onDiscard={onDiscard}
      />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  content: { gap: 20 },
});
