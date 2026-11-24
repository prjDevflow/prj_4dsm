import { EmptyState, Header, ScreenContainer } from '@/components/ui';
import { ThemeProvider } from '@/theme';
import type { ComingSoonArea } from './comingSoon.areas';

type ComingSoonViewProps = { area: ComingSoonArea; onBack: () => void };

export const ComingSoonView = ({ area, onBack }: ComingSoonViewProps) => (
  <ThemeProvider scale={area.admin ? 'admin' : 'pessoa'}>
    <ScreenContainer header={<Header title={area.title} onBack={onBack} />}>
      <EmptyState
        icon={area.icon}
        title="Em breve"
        message={`Esta tela chega na etapa ${area.step} do app.`}
      />
    </ScreenContainer>
  </ThemeProvider>
);
