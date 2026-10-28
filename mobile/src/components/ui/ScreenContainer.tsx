import { Children, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

type ScreenContainerProps = {
  children: ReactNode;
  /** Fixed above the content (usually the Header). */
  header?: ReactNode;
  /** Fixed at the bottom, above the keyboard (form buttons). */
  footer?: ReactNode;
  /** "row" puts the footer items side by side with the same width ("Cancelar" and "Salvar"). */
  footerDirection?: 'row' | 'column';
  /** Lists bring their own scroll (FlatList): pass false. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

// Safe area, side margin of 16 and a keyboard that never covers the focused field.
export const ScreenContainer = ({
  children,
  header,
  footer,
  footerDirection = 'column',
  scroll = true,
  contentStyle,
}: ScreenContainerProps) => {
  const { colors, screenMargin } = useTheme();
  const padding = { paddingHorizontal: screenMargin };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.fundo }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {header ? <View style={padding}>{header}</View> : null}
        {scroll ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={[styles.content, padding, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.content, padding, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              padding,
              { borderTopColor: colors.contornoSuave },
              footerDirection === 'row' && styles.footerRow,
            ]}
          >
            {footerDirection === 'row'
              ? Children.map(footer, (item) => <View style={styles.fill}>{item}</View>)
              : footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: { flexGrow: 1, gap: 16, paddingVertical: 16 },
  footer: { gap: 12, paddingVertical: 16, borderTopWidth: 1 },
  footerRow: { flexDirection: 'row', gap: 16 },
});
