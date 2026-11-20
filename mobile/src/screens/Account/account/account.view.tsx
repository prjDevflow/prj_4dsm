import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Avatar, Button, Card, Header, ScreenContainer, StatusBadge, Text } from '@/components/ui';
import { LogoutDialog } from '@/screens/Account/logout/LogoutDialog';
import { colors, ThemeProvider } from '@/theme';
import type { useAccountModel } from './account.model';

type AccountViewProps = ReturnType<typeof useAccountModel> & { appVersion: string };

type InfoRowProps = { label: string; value: string; last?: boolean };

const InfoRow = ({ label, value, last = false }: InfoRowProps) => (
  <View
    style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.contornoSuave }]}
  >
    <Text variant="pessoaApoio" color="textoApoio">
      {label}
    </Text>
    <Text variant="pessoaCorpoForte">{value}</Text>
  </View>
);

// T13 (Figma "Passe"). The theme option is still an Idea in the design (❓ 2).
export const AccountView = ({
  nome,
  email,
  perfil,
  isAdmin,
  appVersion,
  onBack,
  logoutDialogVisible,
  onRequestLogout,
  onCancelLogout,
  onConfirmLogout,
}: AccountViewProps) => (
  <ThemeProvider scale={isAdmin ? 'admin' : 'pessoa'}>
    <ScreenContainer header={<Header title="Minha conta" onBack={onBack} />}>
      <View style={styles.identity}>
        <Avatar nome={nome} size={96} />
        <Text variant="pessoaTitulo">{nome}</Text>
        <StatusBadge tone="primario" label={perfil} />
      </View>

      <Card style={styles.card}>
        <InfoRow label="Nome completo" value={nome} />
        <InfoRow label="E-mail" value={email} />
        <InfoRow label="Perfil" value={perfil} last />
      </Card>

      <Card tone="baixa" style={styles.note}>
        <Icon name="info" color={colors.textoApoio} />
        <Text color="textoApoio" style={styles.noteText}>
          Para mudar seus dados ou sua senha, procure a administração.
        </Text>
      </Card>

      <Text variant="adminLegenda" color="textoApoio">
        {`Versão ${appVersion}`}
      </Text>

      <Button variant="contorno" label="Sair" onPress={onRequestLogout} />

      <LogoutDialog
        visible={logoutDialogVisible}
        onCancel={onCancelLogout}
        onConfirm={onConfirmLogout}
      />
    </ScreenContainer>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  identity: { gap: 12, alignItems: 'flex-start' },
  card: { gap: 0, paddingVertical: 4 },
  row: { gap: 2, paddingVertical: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  noteText: { flex: 1 },
});
