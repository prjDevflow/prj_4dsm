import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * "Cancelar", the back arrow and Android's back button: with changes they ask "Descartar
 * alterações?", without them they just leave. `enabled: false` hands the back button to
 * someone else (the screen of the terminal key).
 */
export const useDiscardGuard = (isDirty: boolean, onClose: () => void, enabled = true) => {
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);

  const onCancel = () => (isDirty ? setDiscardDialogVisible(true) : onClose());

  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });
  useEffect(() => {
    if (!enabled) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancelRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [enabled]);

  return {
    discardDialogVisible,
    onCancel,
    onKeepEditing: () => setDiscardDialogVisible(false),
    onDiscard: () => {
      setDiscardDialogVisible(false);
      onClose();
    },
  };
};
