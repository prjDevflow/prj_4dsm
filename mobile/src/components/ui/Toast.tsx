import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

const TOAST_DURATION_MS = 3000;

type ToastApi = {
  /** Short confirmation ("Autorização criada."). Never use it for an important error. */
  show: (message: string) => void;
};

const ToastContext = createContext<ToastApi>({ show: () => {} });

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    timer.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { backgroundColor: theme.colors.inverso, borderRadius: theme.radius.avisoCurto },
          ]}
        >
          <Text color="inversoSobre">{message}</Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 6,
  },
});
