import { Dialog } from '@/components/ui';

type LogoutDialogProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => unknown;
};

export const LogoutDialog = ({ visible, onCancel, onConfirm }: LogoutDialogProps) => (
  <Dialog
    visible={visible}
    title="Deseja sair?"
    cancelLabel="Cancelar"
    confirmLabel="Sair"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);
