import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Alert, Button, Dialog } from '@/components/ui';

const STACK_FONT_SCALE = 1.3;

type FormFooterProps = {
  apiError: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => unknown;
  /** "Salvar" by default; "Criar autorização" on T24. */
  saveLabel?: string;
  savingLabel?: string;
};

/** "Cancelar" and "Salvar", with the error strip above them: in sight however far the form scrolled. */
export const FormFooter = ({
  apiError,
  isSaving,
  onCancel,
  onSave,
  saveLabel = 'Salvar',
  savingLabel = 'Salvando…',
}: FormFooterProps) => {
  // With a large system font, side by side would break "Criar autorização" in the middle.
  const stacked = useWindowDimensions().fontScale >= STACK_FONT_SCALE;
  return (
    <>
      {apiError ? <Alert tone="erro" message={apiError} /> : null}
      <View testID="form-footer-actions" style={stacked ? styles.stacked : styles.actions}>
        <View style={stacked ? undefined : styles.action}>
          <Button variant="contorno" label="Cancelar" onPress={onCancel} disabled={isSaving} />
        </View>
        <View style={stacked ? undefined : styles.action}>
          <Button
            label={saveLabel}
            loadingLabel={savingLabel}
            loading={isSaving}
            onPress={onSave}
          />
        </View>
      </View>
    </>
  );
};

type DiscardDialogProps = { visible: boolean; onKeepEditing: () => void; onDiscard: () => void };

export const DiscardDialog = ({ visible, onKeepEditing, onDiscard }: DiscardDialogProps) => (
  <Dialog
    visible={visible}
    title="Descartar alterações?"
    message="O que você preencheu será perdido."
    cancelLabel="Continuar editando"
    confirmLabel="Descartar"
    destructive
    onCancel={onKeepEditing}
    onConfirm={onDiscard}
  />
);

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 16 },
  // Stacked, the main action stays on top, closest to the thumb's reach after reading.
  stacked: { flexDirection: 'column-reverse', gap: 12 },
  action: { flex: 1 },
});
