import { Controller, type Control } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { Header, ScreenContainer, SwitchField, TextField } from '@/components/ui';
import { DiscardDialog, FormFooter } from '@/screens/Shared/form/FormFooter';
import { FormLoadState } from '@/screens/Shared/form/FormLoadState';
import { ThemeProvider } from '@/theme';
import { CoordinateFields, type CoordinateValues } from '../shared/CoordinateFields';
import type { useBuildingFormModel } from './buildingForm.model';

type BuildingFormViewProps = ReturnType<typeof useBuildingFormModel>;

// T18 Edifício (Figma "Passe").
export const BuildingFormView = ({
  form,
  title,
  status,
  loadErrorMessage,
  onRetryLoad,
  onSubmit,
  isSaving,
  apiError,
  locating,
  locationError,
  onUseCurrentLocation,
  discardDialogVisible,
  onCancel,
  onKeepEditing,
  onDiscard,
}: BuildingFormViewProps) => {
  const header = <Header title={title} onBack={onCancel} />;

  if (status !== 'ready') {
    return (
      <ThemeProvider scale="admin">
        <ScreenContainer header={header}>
          <FormLoadState
            status={status}
            loadingLabel="Carregando edifício…"
            notFoundTitle="Edifício não encontrado."
            errorTitle="Não foi possível carregar o edifício."
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
              placeholder="Edifício Central"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              maxLength={120}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus('endereco')}
            />
          )}
        />
        <Controller
          control={form.control}
          name="endereco"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Endereço"
              placeholder="Rua das Acácias, 120"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoComplete="street-address"
              maxLength={255}
              returnKeyType="next"
              submitBehavior="blurAndSubmit"
            />
          )}
        />
        <CoordinateFields
          control={form.control as unknown as Control<CoordinateValues>}
          locating={locating}
          locationError={locationError}
          onUseCurrentLocation={onUseCurrentLocation}
        />
        <Controller
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <SwitchField
              label="Ativo"
              help="Desativar o edifício desativa também os locais dele."
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
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
