import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { ScreenContainer, Text } from '@/components/ui';
import { colors } from '@/theme';

type MessageScreenProps = {
  icon: IconName;
  title: string;
  footer: ReactNode;
  children?: ReactNode;
};

// T06 and T08: the same layout explains a question, a refusal and a phone without a camera.
export const MessageScreen = ({ icon, title, footer, children }: MessageScreenProps) => (
  <ScreenContainer footer={footer} contentStyle={styles.message}>
    <Cookie12 color={colors.primariaContainer} size={120}>
      <Icon name={icon} size={56} color={colors.primariaContainerSobre} />
    </Cookie12>
    <Text variant="pessoaTitulo" accessibilityRole="header">
      {title}
    </Text>
    {children}
  </ScreenContainer>
);

const styles = StyleSheet.create({
  message: { gap: 24, paddingTop: 48 },
});
