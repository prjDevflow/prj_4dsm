import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { Avatar, Button, NavRow, OfflineBanner, ScreenContainer, Text } from '@/components/ui';
import { LogoutDialog } from '@/screens/Account/logout/LogoutDialog';
import { colors } from '@/theme';
import type { useUserHomeModel } from './home.model';

type UserHomeViewProps = ReturnType<typeof useUserHomeModel>;

// T03 (Figma "Passe"). The "Você pode entrar agora" card is an Idea in the design (❓ 3).
export const UserHomeView = ({
  nome,
  greeting,
  isOffline,
  activeCount,
  onOpenAccount,
  onOpenScanner,
  onOpenAuthorizations,
  onOpenHistory,
  logoutDialogVisible,
  onRequestLogout,
  onCancelLogout,
  onConfirmLogout,
}: UserHomeViewProps) => (
  <ScreenContainer contentStyle={styles.content}>
    <View style={styles.top}>
      <View style={styles.brand}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Cookie12 color={colors.primaria} size={40}>
            <Icon name="check" size={20} color={colors.primariaSobre} />
          </Cookie12>
        </View>
        <Text variant="pessoaDestaque">Passe</Text>
      </View>
      <Avatar nome={nome} accessibilityLabel="Minha conta" onPress={onOpenAccount} />
    </View>

    {isOffline ? <OfflineBanner /> : null}

    <Text variant="pessoaTitulo" accessibilityRole="header">
      {greeting}
    </Text>

    <Button
      variant="catraca"
      hero
      icon="qr_code_scanner"
      label="Abrir catraca"
      onPress={onOpenScanner}
    />

    <View style={styles.rows}>
      <NavRow
        icon="confirmation_number"
        label="Minhas autorizações"
        count={
          activeCount > 0
            ? { value: activeCount, label: activeCount === 1 ? '1 ativa' : `${activeCount} ativas` }
            : undefined
        }
        onPress={onOpenAuthorizations}
      />
      <NavRow icon="history" label="Meu histórico" onPress={onOpenHistory} />
    </View>

    <View style={styles.footer}>
      <Button
        variant="texto"
        icon="logout"
        label="Sair"
        onPress={onRequestLogout}
        fullWidth={false}
      />
    </View>

    <LogoutDialog
      visible={logoutDialogVisible}
      onCancel={onCancelLogout}
      onConfirm={onConfirmLogout}
    />
  </ScreenContainer>
);

const styles = StyleSheet.create({
  content: { gap: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  rows: { gap: 12 },
  footer: { marginTop: 'auto', alignItems: 'center', paddingTop: 16 },
});
