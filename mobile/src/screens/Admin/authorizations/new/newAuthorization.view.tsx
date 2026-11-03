import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import {
  Alert,
  Button,
  Card,
  DateField,
  Header,
  NumberStepper,
  ScreenContainer,
  SelectField,
  Text,
  TimeField,
} from '@/components/ui';
import { DiscardDialog, FormFooter } from '@/screens/Shared/form/FormFooter';
import { FormLoadState } from '@/screens/Shared/form/FormLoadState';
import { ThemeProvider, useTheme } from '@/theme';
import type { useNewAuthorizationModel } from './newAuthorization.model';

type NewAuthorizationViewProps = ReturnType<typeof useNewAuthorizationModel> & {
  onGoToUsers: () => void;
  onGoToLocations: () => void;
};

type MissingProps = { message: string; action: string; onPress: () => void };

/** Instead of a select that opens empty: what is missing and where to register it. */
const Missing = ({ message, action, onPress }: MissingProps) => (
  <View style={styles.missing}>
    <Alert tone="info" message={message} />
    <Button variant="texto" label={action} onPress={onPress} fullWidth={false} />
  </View>
);

const Summary = ({ text }: { text: string | null }) => {
  const theme = useTheme();
  return (
    <Card
      tone="container"
      testID="authorization-summary"
      accessibilityLiveRegion="polite"
      style={styles.summary}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Cookie12 color={theme.colors.primariaContainerSobre} size={36}>
          <Icon name="confirmation_number" size={20} color={theme.colors.primariaContainer} />
        </Cookie12>
      </View>
      <View style={styles.fill}>
        <Text variant="adminItem" color="primariaContainerSobre">
          Resumo
        </Text>
        <Text color="primariaContainerSobre">
          {text ?? 'O resumo aparece quando todos os campos estiverem certos.'}
        </Text>
      </View>
    </Card>
  );
};

// T24 Nova autorização (Figma "Passe").
export const NewAuthorizationView = ({
  form,
  status,
  loadErrorMessage,
  onRetryLoad,
  personOptions,
  placeOptions,
  hasNoPeople,
  hasNoPlaces,
  summary,
  minEndDate,
  onOnlyToday,
  onNextSevenDays,
  onSubmit,
  isSaving,
  apiError,
  discardDialogVisible,
  onCancel,
  onKeepEditing,
  onDiscard,
  onGoToUsers,
  onGoToLocations,
}: NewAuthorizationViewProps) => {
  const header = <Header title="Nova autorização" onBack={onCancel} />;

  if (status !== 'ready') {
    return (
      <ThemeProvider scale="admin">
        <ScreenContainer header={header}>
          <FormLoadState
            status={status}
            loadingLabel="Carregando pessoas e locais…"
            notFoundTitle=""
            errorTitle="Não foi possível carregar as pessoas e os locais."
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
            saveLabel="Criar autorização"
            savingLabel="Criando…"
          />
        }
        contentStyle={styles.content}
      >
        {hasNoPeople ? (
          <Missing
            message="Nenhuma pessoa ativa cadastrada."
            action="Cadastrar pessoa"
            onPress={onGoToUsers}
          />
        ) : (
          <Controller
            control={form.control}
            name="usuarioId"
            render={({ field, fieldState }) => (
              <SelectField
                label="Pessoa"
                options={personOptions}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                searchable
                searchPlaceholder="Busque pelo nome ou e-mail"
              />
            )}
          />
        )}

        {hasNoPlaces ? (
          <Missing
            message="Nenhum local de acesso ativo cadastrado."
            action="Cadastrar local"
            onPress={onGoToLocations}
          />
        ) : (
          <Controller
            control={form.control}
            name="accessPointId"
            render={({ field, fieldState }) => (
              <SelectField
                label="Local de acesso"
                options={placeOptions}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                searchable={placeOptions.length > 6}
                searchPlaceholder="Busque pelo local ou edifício"
              />
            )}
          />
        )}

        <View style={styles.block}>
          <Text variant="adminRotulo">Período</Text>
          <View style={styles.shortcuts}>
            <Button
              variant="contorno"
              size="admin"
              label="Só hoje"
              onPress={onOnlyToday}
              fullWidth={false}
            />
            <Button
              variant="contorno"
              size="admin"
              label="Próximos 7 dias"
              onPress={onNextSevenDays}
              fullWidth={false}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Controller
                control={form.control}
                name="dataInicio"
                render={({ field, fieldState }) => (
                  <DateField
                    label="Data inicial"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <View style={styles.cell}>
              <Controller
                control={form.control}
                name="dataFim"
                render={({ field, fieldState }) => (
                  <DateField
                    label="Data final"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    minimumDate={minEndDate}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.cell}>
            <Controller
              control={form.control}
              name="horaInicio"
              render={({ field, fieldState }) => (
                <TimeField
                  label="Horário inicial"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View style={styles.cell}>
            <Controller
              control={form.control}
              name="horaFim"
              render={({ field, fieldState }) => (
                <TimeField
                  label="Horário final"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={form.control}
          name="usosPermitidos"
          render={({ field, fieldState }) => (
            <NumberStepper
              label="Número de utilizações (de 1 a 1.000)"
              value={field.value}
              onChange={field.onChange}
              min={1}
              max={1000}
              error={fieldState.error?.message}
            />
          )}
        />

        <Summary text={summary} />
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
  fill: { flex: 1, gap: 4 },
  content: { gap: 20 },
  block: { gap: 12 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // With a large system font the two fields wrap one under the other.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexGrow: 1, flexBasis: 140 },
  missing: { gap: 4, alignItems: 'flex-start' },
  summary: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
