import { Controller, type Control } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import {
  Header,
  ScreenContainer,
  SegmentedField,
  SelectField,
  SwitchField,
  TextField,
} from '@/components/ui';
import { DiscardDialog, FormFooter } from '@/screens/Shared/form/FormFooter';
import { FormLoadState } from '@/screens/Shared/form/FormLoadState';
import { ThemeProvider } from '@/theme';
import { CoordinateFields, type CoordinateValues } from '../shared/CoordinateFields';
import { tipoOptions, type useAccessPointFormModel } from './accessPointForm.model';

type AccessPointFormViewProps = ReturnType<typeof useAccessPointFormModel>;

// T19 Ponto de acesso (Figma "Passe").
export const AccessPointFormView = ({
  form,
  mode,
  title,
  status,
  buildingOptions,
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
}: AccessPointFormViewProps) => {
  const header = <Header title={title} onBack={onCancel} />;

  if (status !== 'ready') {
    return (
      <ThemeProvider scale="admin">
        <ScreenContainer header={header}>
          <FormLoadState
            status={status}
            loadingLabel="Carregando local…"
            notFoundTitle="Local não encontrado."
            errorTitle="Não foi possível carregar o local."
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
          name="buildingId"
          render={({ field, fieldState }) => (
            <SelectField
              label="Edifício"
              options={buildingOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              help={mode === 'edit' ? 'O edifício de um local não muda.' : undefined}
              disabled={mode === 'edit'}
            />
          )}
        />
        <Controller
          control={form.control}
          name="tipo"
          render={({ field, fieldState }) => (
            <SegmentedField
              label="Tipo"
              options={tipoOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="nome"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Nome"
              placeholder="Catraca Social"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="words"
              maxLength={120}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => form.setFocus('identificacao')}
            />
          )}
        />
        <Controller
          control={form.control}
          name="identificacao"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Identificação"
              help="Exemplo: CAT-01"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={60}
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
              help="Inativo, ninguém passa por este local."
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
