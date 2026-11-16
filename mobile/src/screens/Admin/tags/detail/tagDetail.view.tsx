import { StyleSheet, View } from 'react-native';
import {
  Alert,
  Dialog,
  EmptyState,
  Header,
  ScreenContainer,
  SwitchField,
  Text,
} from '@/components/ui';
import { formatDateTime } from '@/lib/dateValue';
import type { TagNfc } from '@/lib/types/nfcTags';
import { ThemeProvider, useTheme } from '@/theme';

type TagDetailViewProps = {
  tag: TagNfc | null;
  pessoa: string;
  confirmVisible: boolean;
  isSaving: boolean;
  apiError: string | null;
  onToggleAtiva: (ativa: boolean) => void;
  onConfirmDeactivate: () => unknown;
  onCancelDeactivate: () => void;
  onBack: () => void;
};

const Field = ({ label, value }: { label: string; value: string }) => {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.field, { borderBottomColor: colors.contornoSuave }]}
    >
      <Text variant="adminApoio" color="textoApoio">
        {label}
      </Text>
      <Text variant="adminItem">{value}</Text>
    </View>
  );
};

// Detail of a tag: the whole code, and "Tag ativa", which asks before turning it off.
export const TagDetailView = ({
  tag,
  pessoa,
  confirmVisible,
  isSaving,
  apiError,
  onToggleAtiva,
  onConfirmDeactivate,
  onCancelDeactivate,
  onBack,
}: TagDetailViewProps) => {
  const theme = useTheme();
  return (
    <ThemeProvider scale="admin">
      <ScreenContainer header={<Header title="Tag NFC" onBack={onBack} />}>
        {tag ? (
          <>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.superficieBaixa,
                  borderRadius: theme.radius.cartao,
                },
              ]}
            >
              <Field label="Código" value={tag.uid} />
              <Field label="Pessoa" value={pessoa || '…'} />
              {tag.descricao ? <Field label="Descrição" value={tag.descricao} /> : null}
              <Field label="Vinculada em" value={formatDateTime(tag.criadaEm)} />
            </View>
            <SwitchField
              label="Tag ativa"
              value={tag.ativa}
              onValueChange={onToggleAtiva}
              disabled={isSaving}
              help={
                tag.ativa
                  ? 'Encostar a tag no terminal abre a catraca, se houver autorização.'
                  : 'Desativada: o terminal não aceita esta tag.'
              }
            />
            {apiError ? <Alert tone="erro" message={apiError} /> : null}
            <Dialog
              visible={confirmVisible}
              title="Desativar esta tag?"
              message="A tag deixa de abrir a catraca na hora. Você pode ativá-la de novo depois."
              confirmLabel="Desativar"
              cancelLabel="Voltar"
              destructive
              confirmLoading={isSaving}
              confirmLoadingLabel="Desativando…"
              onConfirm={onConfirmDeactivate}
              onCancel={onCancelDeactivate}
            />
          </>
        ) : (
          <EmptyState
            icon="nfc"
            title="Tag não encontrada."
            message="Abra a tag pela lista de tags."
            action={{ label: 'Voltar para a lista', onPress: onBack }}
          />
        )}
      </ScreenContainer>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 4 },
  field: { gap: 2, paddingVertical: 12, borderBottomWidth: 1 },
});
