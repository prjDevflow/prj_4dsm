import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Dialog,
  Header,
  ProgressBar,
  ScreenContainer,
  StatusBadge,
  Text,
  TextField,
} from '@/components/ui';
import { FormLoadState } from '@/screens/Shared/form/FormLoadState';
import { colors, ThemeProvider } from '@/theme';
import type { useAuthorizationDetailModel } from './authorizationDetail.model';

type AuthorizationDetailViewProps = ReturnType<typeof useAuthorizationDetailModel> & {
  onBack: () => void;
};

type InfoRowProps = { label: string; last?: boolean; children: ReactNode };

const InfoRow = ({ label, last = false, children }: InfoRowProps) => (
  <View
    style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.contornoSuave }]}
  >
    <Text variant="adminApoio" color="textoApoio">
      {label}
    </Text>
    {children}
  </View>
);

// T25 Autorização and the cancellation dialog (Figma "Passe").
export const AuthorizationDetailView = ({
  status,
  details,
  loadErrorMessage,
  onRetryLoad,
  canCancel,
  form,
  cancelDialogVisible,
  cancelError,
  isCancelling,
  onRequestCancel,
  onKeepAuthorization,
  onConfirmCancel,
  onBack,
}: AuthorizationDetailViewProps) => (
  <ThemeProvider scale="admin">
    <ScreenContainer header={<Header title="Autorização" onBack={onBack} />}>
      {status !== 'ready' || !details ? (
        <FormLoadState
          status={status === 'ready' ? 'loading' : status}
          loadingLabel="Carregando autorização…"
          notFoundTitle="Autorização não encontrada."
          notFoundMessage="Volte para a lista e confira."
          errorTitle="Não foi possível carregar a autorização."
          errorMessage={loadErrorMessage}
          onRetry={onRetryLoad}
          onBack={onBack}
        />
      ) : (
        <>
          <View style={styles.identity}>
            <Avatar nome={details.pessoa} size={56} />
            <View style={styles.fill}>
              <Text variant="adminTitulo">{details.pessoa}</Text>
              <Text variant="adminApoio" color="textoApoio">
                {details.perfil}
              </Text>
            </View>
            <StatusBadge status={details.situacao} />
          </View>

          <Card style={styles.card}>
            <InfoRow label="Local">
              <Text variant="adminItem">{details.local}</Text>
            </InfoRow>
            <InfoRow label="Período">
              <Text variant="adminItem">{details.periodo}</Text>
            </InfoRow>
            <InfoRow label="Horário">
              <Text variant="adminItem">{details.horario}</Text>
            </InfoRow>
            <InfoRow label="Entradas" last>
              <Text variant="adminItem">{details.entradas}</Text>
              <ProgressBar
                value={details.usosRealizados}
                total={details.usosPermitidos}
                accessibilityLabel="Entradas usadas"
              />
              <Text variant="adminApoio" color="textoApoio">
                {details.restantes}
              </Text>
            </InfoRow>
          </Card>

          <View style={styles.audit}>
            <Text variant="adminApoio" color="textoApoio">
              {details.criadaPor}
            </Text>
            {details.canceladaPor ? (
              <Text variant="adminApoio" color="textoApoio">
                {details.canceladaPor}
              </Text>
            ) : null}
            {details.motivo ? (
              <Text variant="adminApoio" color="textoApoio">
                {details.motivo}
              </Text>
            ) : null}
          </View>

          {canCancel ? (
            <Button
              variant="perigoContorno"
              label="Cancelar autorização"
              onPress={onRequestCancel}
            />
          ) : null}
        </>
      )}
    </ScreenContainer>

    <Dialog
      visible={cancelDialogVisible}
      title="Cancelar esta autorização?"
      message="A pessoa não poderá mais entrar com ela. Esta ação não pode ser desfeita."
      cancelLabel="Voltar"
      confirmLabel="Cancelar autorização"
      confirmLoading={isCancelling}
      confirmLoadingLabel="Cancelando…"
      destructive
      onCancel={onKeepAuthorization}
      onConfirm={onConfirmCancel}
    >
      <Controller
        control={form.control}
        name="motivo"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label="Motivo (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            editable={!isCancelling}
            multiline
            maxLength={200}
          />
        )}
      />
      {cancelError ? <Alert tone="erro" message={cancelError} /> : null}
    </Dialog>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { gap: 0, paddingVertical: 4 },
  row: { gap: 6, paddingVertical: 12 },
  audit: { gap: 4 },
});
