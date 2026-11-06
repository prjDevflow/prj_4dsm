import { Modal, StyleSheet, View } from 'react-native';
import { useReducedMotion, useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  /** Names the action ("Cancelar autorização", "Desativar"), never just "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => unknown;
  onCancel: () => void;
  /** Irreversible action: the confirm button uses the "perigo" variant. */
  destructive?: boolean;
  confirmLoading?: boolean;
  confirmLoadingLabel?: string;
};

export const Dialog = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Voltar',
  onConfirm,
  onCancel,
  destructive = false,
  confirmLoading = false,
  confirmLoadingLabel,
}: DialogProps) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
    >
      <View style={[styles.scrim, { backgroundColor: theme.colors.veu }]}>
        <View
          accessibilityViewIsModal
          style={[
            styles.box,
            { backgroundColor: theme.colors.superficieAlta, borderRadius: theme.radius.dialogo },
          ]}
        >
          <Text
            variant={theme.scale === 'admin' ? 'adminTitulo' : 'pessoaDestaque'}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {message ? <Text color="textoApoio">{message}</Text> : null}
          <View style={styles.actions}>
            <Button
              variant="texto"
              label={cancelLabel}
              onPress={onCancel}
              fullWidth={false}
              disabled={confirmLoading}
            />
            <Button
              variant={destructive ? 'perigo' : 'principal'}
              label={confirmLabel}
              loadingLabel={confirmLoadingLabel}
              loading={confirmLoading}
              onPress={onConfirm}
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', padding: 24 },
  box: { padding: 24, gap: 16 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});
