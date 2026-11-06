import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSessionStore } from '@/context/SessionStore';

// "Sair" asks first; confirming erases the token and every cached answer of this person.
export const useLogoutModel = () => {
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const signOut = useSessionStore((state) => state.signOut);
  const queryClient = useQueryClient();

  return {
    logoutDialogVisible,
    onRequestLogout: () => setLogoutDialogVisible(true),
    onCancelLogout: () => setLogoutDialogVisible(false),
    onConfirmLogout: async () => {
      setLogoutDialogVisible(false);
      // The guards in src/app/_layout.tsx swap the stack for the login: "back" cannot return.
      await signOut();
      queryClient.clear();
    },
  };
};
