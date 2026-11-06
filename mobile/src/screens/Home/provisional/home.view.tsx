import { Alert, Button, Card, Header, ScreenContainer, StatusBadge, Text } from '@/components/ui';
import { ThemeProvider } from '@/theme';
import type { useProvisionalHomeModel } from './home.model';

type ProvisionalHomeViewProps = ReturnType<typeof useProvisionalHomeModel>;

export const ProvisionalHomeView = ({
  isAdmin,
  title,
  greeting,
  perfil,
  email,
  onSignOut,
}: ProvisionalHomeViewProps) => (
  <ThemeProvider scale={isAdmin ? 'admin' : 'pessoa'}>
    <ScreenContainer header={<Header title={title} />}>
      <Text variant={isAdmin ? 'adminTitulo' : 'pessoaTitulo'}>{greeting}</Text>
      <Card>
        <StatusBadge tone={isAdmin ? 'primario' : 'neutro'} label={perfil} />
        <Text color="textoApoio">{email}</Text>
      </Card>
      <Alert
        tone="info"
        message="Esta tela é provisória: o início de verdade chega na próxima etapa."
      />
      <Button variant="contorno" label="Sair" onPress={onSignOut} />
    </ScreenContainer>
  </ThemeProvider>
);
