import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, Header, ScreenContainer, SelectField, Text, TextField } from '@/components/ui';
import { DiscardDialog, FormFooter } from '@/screens/Shared/form/FormFooter';
import { ThemeProvider, useTheme } from '@/theme';
import type { useTagFormModel } from './tagForm.model';

type TagFormViewProps = ReturnType<typeof useTagFormModel>;

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.contornoSuave }]} />;
};

// T29 Vincular tag (Figma "Passe").
export const TagFormView = ({
  form,
  personOptions,
  onSubmit,
  isSaving,
  apiError,
  onReadOnTerminal,
  discardDialogVisible,
  onCancel,
  onKeepEditing,
  onDiscard,
}: TagFormViewProps) => (
  <ThemeProvider scale="admin">
    <ScreenContainer
      header={<Header title="Vincular tag" onBack={onCancel} />}
      footer={
        <FormFooter apiError={apiError} isSaving={isSaving} onCancel={onCancel} onSave={onSubmit} />
      }
      contentStyle={styles.content}
    >
      <Controller
        control={form.control}
        name="usuarioId"
        render={({ field, fieldState }) => (
          <SelectField
            label="Pessoa"
            options={personOptions}
            value={field.value || null}
            onChange={field.onChange}
            searchable
            searchPlaceholder="Busque pelo nome ou e-mail"
            placeholder="Escolha a pessoa"
            help="Busque pelo nome. Só aparecem usuários ativos."
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="uid"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label="Código da tag (UID)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            help="Exemplo: 04A1B2C3D4"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={40}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('descricao')}
          />
        )}
      />
      <Controller
        control={form.control}
        name="descricao"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label="Descrição (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            maxLength={120}
            returnKeyType="done"
          />
        )}
      />
      <Divider />
      <Text variant="adminCorpo" color="textoApoio">
        Não sabe o código? Aproxime a tag de um terminal.
      </Text>
      <Button
        variant="tonal"
        icon="contactless"
        label="Ler tag no terminal"
        onPress={onReadOnTerminal}
      />
      <DiscardDialog
        visible={discardDialogVisible}
        onKeepEditing={onKeepEditing}
        onDiscard={onDiscard}
      />
    </ScreenContainer>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  content: { gap: 20 },
  divider: { height: 1 },
});
