import { Controller } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import {
  Alert,
  Button,
  Dialog,
  ErrorState,
  Header,
  LoadingState,
  PasswordField,
  RadioGroup,
  ScreenContainer,
  SwitchField,
  TextField,
  type RadioOption,
} from '@/components/ui';
import { perfilLabel } from '@/lib/perfil';
import type { Perfil } from '@/lib/types/auth';
import { ThemeProvider } from '@/theme';
import type { useUserFormModel } from './userForm.model';

type UserFormViewProps = ReturnType<typeof useUserFormModel>;

const perfis: RadioOption<Perfil>[] = (['ADMIN', 'CONDOMINO', 'VISITANTE'] as const).map(
  (value) => ({ value, label: perfilLabel(value) }),
);

// T16 Cadastro e edição de usuário (Figma "Passe").
export const UserFormView = ({
  form,
  mode,
  title,
  status,
  loadErrorMessage,
  onRetryLoad,
  onSubmit,
  isSaving,
  apiError,
  discardDialogVisible,
  onCancel,
  onKeepEditing,
  onDiscard,
}: UserFormViewProps) => {
  const header = <Header title={title} onBack={onCancel} />;
  const editing = mode === 'edit';

  if (status !== 'ready') {
    return (
      <ThemeProvider scale="admin">
        <ScreenContainer header={header}>
          {status === 'loading' ? (
            <LoadingState label="Carregando usuário…" />
          ) : status === 'notFound' ? (
            <ErrorState
              title="Usuário não encontrado."
              message="Ele pode ter sido removido da lista. Volte e busque de novo."
              icon="search_off"
              tone="neutro"
              retryLabel="Voltar para a lista"
              onRetry={onCancel}
            />
          ) : (
            <ErrorState
              title="Não foi possível carregar o usuário."
              message={loadErrorMessage}
              onRetry={onRetryLoad}
            />
          )}
        </ScreenContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider scale="admin">
      <ScreenContainer
        header={header}
        footerDirection="row"
        footer={
          <>
            <Button variant="contorno" label="Cancelar" onPress={onCancel} disabled={isSaving} />
            <Button label="Salvar" loadingLabel="Salvando…" loading={isSaving} onPress={onSubmit} />
          </>
        }
        contentStyle={styles.content}
      >
        <Controller
          control={form.control}
          name="nome"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Nome completo"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              maxLength={120}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus(editing ? 'senha' : 'email')}
            />
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="E-mail"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              help={editing ? 'O e-mail não pode ser alterado.' : undefined}
              readOnly={editing}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              maxLength={254}
              returnKeyType="next"
              submitBehavior="blurAndSubmit"
            />
          )}
        />

        <Controller
          control={form.control}
          name="perfil"
          render={({ field, fieldState }) => (
            <RadioGroup
              label="Perfil"
              options={perfis}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="senha"
          render={({ field, fieldState }) => (
            <PasswordField
              ref={field.ref}
              label={editing ? 'Nova senha (opcional)' : 'Senha'}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              help={
                editing
                  ? 'Deixe em branco para manter a senha atual. De 8 a 72 caracteres.'
                  : 'De 8 a 72 caracteres.'
              }
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={72}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus('confirmarSenha')}
            />
          )}
        />

        <Controller
          control={form.control}
          name="confirmarSenha"
          render={({ field, fieldState }) => (
            <PasswordField
              ref={field.ref}
              label="Confirmar senha"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={72}
              returnKeyType="done"
            />
          )}
        />

        {editing ? (
          <Controller
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <SwitchField
                label="Usuário ativo"
                help="Inativo não entra no app nem passa na catraca."
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        ) : null}

        {apiError ? <Alert tone="erro" message={apiError} /> : null}
      </ScreenContainer>

      <Dialog
        visible={discardDialogVisible}
        title="Descartar alterações?"
        message="O que você preencheu será perdido."
        cancelLabel="Continuar editando"
        confirmLabel="Descartar"
        destructive
        onCancel={onKeepEditing}
        onConfirm={onDiscard}
      />
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  content: { gap: 20 },
});
