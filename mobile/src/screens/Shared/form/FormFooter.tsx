import { StyleSheet, View } from 'react-native';
import { Alert, Button, Dialog } from '@/components/ui';

type FormFooterProps = {
  apiError: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => unknown;
};

/** "Cancelar" and "Salvar", with the error strip above them: in sight however far the form scrolled. */
export const FormFooter = ({ apiError, isSaving, onCancel, onSave }: FormFooterProps) => (
  <>
    {apiError ? <Alert tone="erro" message={apiError} /> : null}
    <View style={styles.actions}>
      <View style={styles.action}>
        <Button variant="contorno" label="Cancelar" onPress={onCancel} disabled={isSaving} />
      </View>
      <View style={styles.action}>
        <Button label="Salvar" loadingLabel="Salvando…" loading={isSaving} onPress={onSave} />
      </View>
    </View>
  </>
);

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
  action: { flex: 1 },
});
