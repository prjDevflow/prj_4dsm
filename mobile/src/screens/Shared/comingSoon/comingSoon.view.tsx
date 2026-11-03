import type { Href } from 'expo-router';
import { EmptyState, Header, ScreenContainer } from '@/components/ui';
import { ThemeProvider } from '@/theme';
import type { ComingSoonArea } from './comingSoon.areas';

type ComingSoonViewProps = {
  area: ComingSoonArea;
  onBack: () => void;
  /** Opens the screen of the area that already exists ("Nova autorização"). */
  onAction?: (href: Href) => void;
};

export const ComingSoonView = ({ area, onBack, onAction }: ComingSoonViewProps) => (
  <ThemeProvider scale={area.admin ? 'admin' : 'pessoa'}>
    <ScreenContainer header={<Header title={area.title} onBack={onBack} />}>
      <EmptyState
        icon={area.icon}
        title="Em breve"
        message={area.message ?? `Esta tela chega na etapa ${area.step} do app.`}
        action={
          area.action && onAction
            ? { label: area.action.label, onPress: () => onAction(area.action!.href) }
            : undefined
        }
      />
    </ScreenContainer>
  </ThemeProvider>
);
