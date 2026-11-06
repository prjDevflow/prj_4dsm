import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { Arch, Circle, Clover4, Cookie12, Sun8, type ShapeProps } from '@/components/shapes';
import { Avatar, Button, Fab, OfflineBanner, ScreenContainer, Text } from '@/components/ui';
import { LogoutDialog } from '@/screens/Account/logout/LogoutDialog';
import { ThemeProvider, useTheme, type ColorName } from '@/theme';
import type { AdminArea, useAdminHomeModel } from './home.model';

type AdminHomeViewProps = ReturnType<typeof useAdminHomeModel>;

type Tile = {
  area: AdminArea;
  title: string;
  subtitle: string;
  icon: IconName;
  Shape: ComponentType<ShapeProps>;
  background: ColorName;
  foreground: ColorName;
};

// Each area has its own color and shape (tokens.md, area/*).
const authorizations: Tile = {
  area: 'autorizacoes',
  title: 'Autorizações',
  subtitle: 'Criar, consultar e cancelar',
  icon: 'confirmation_number',
  Shape: Cookie12,
  background: 'primariaContainer',
  foreground: 'primariaContainerSobre',
};

const tiles: Tile[] = [
  {
    area: 'usuarios',
    title: 'Usuários',
    subtitle: 'Pessoas e perfis',
    icon: 'group',
    Shape: Clover4,
    background: 'areaUsuarios',
    foreground: 'areaUsuariosSobre',
  },
  {
    area: 'locais',
    title: 'Locais e terminais',
    subtitle: 'Edifícios e catracas',
    icon: 'apartment',
    Shape: Arch,
    background: 'areaLocais',
    foreground: 'areaLocaisSobre',
  },
  {
    area: 'tags',
    title: 'Tags NFC',
    subtitle: 'Vincular às pessoas',
    icon: 'nfc',
    Shape: Sun8,
    background: 'areaTags',
    foreground: 'areaTagsSobre',
  },
  {
    area: 'historico',
    title: 'Histórico',
    subtitle: 'Tentativas de acesso',
    icon: 'history',
    Shape: Circle,
    background: 'areaHistorico',
    foreground: 'areaHistoricoSobre',
  },
];

type AreaTileProps = { tile: Tile; wide?: boolean; onPress: () => void };

const AreaTile = ({ tile, wide = false, onPress }: AreaTileProps) => {
  const theme = useTheme();
  const { Shape } = tile;
  const foreground = theme.colors[tile.foreground];
  const background = theme.colors[tile.background];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tile.title}, ${tile.subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        wide ? styles.tileWide : styles.tileHalf,
        { backgroundColor: background, borderRadius: theme.radius.cartao },
        pressed && styles.pressed,
      ]}
    >
      <Shape color={foreground} size={wide ? 52 : 44}>
        <Icon name={tile.icon} size={wide ? 26 : 22} color={background} />
      </Shape>
      <View style={styles.tileTexts}>
        <Text variant="adminItem" color={tile.foreground}>
          {tile.title}
        </Text>
        <Text variant="adminApoio" color={tile.foreground}>
          {tile.subtitle}
        </Text>
      </View>
      {wide ? <Icon name="chevron_right" color={foreground} /> : null}
    </Pressable>
  );
};

// T14 (Figma "Passe"). The offline-terminal alert is an Idea in the design (❓ 13).
export const AdminHomeView = ({
  nome,
  isOffline,
  onOpenAccount,
  onOpenArea,
  onOpenScanner,
  logoutDialogVisible,
  onRequestLogout,
  onCancelLogout,
  onConfirmLogout,
}: AdminHomeViewProps) => (
  <ThemeProvider scale="admin">
    <View style={styles.screen}>
      <ScreenContainer contentStyle={styles.content}>
        <View style={styles.top}>
          <View style={styles.titles}>
            <Text variant="adminTitulo" accessibilityRole="header">
              Administração
            </Text>
            <Text variant="adminApoio" color="textoApoio">
              {nome}
            </Text>
          </View>
          <Avatar nome={nome} accessibilityLabel="Minha conta" onPress={onOpenAccount} />
        </View>

        {isOffline ? <OfflineBanner /> : null}

        <AreaTile tile={authorizations} wide onPress={() => onOpenArea(authorizations.area)} />
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <AreaTile key={tile.area} tile={tile} onPress={() => onOpenArea(tile.area)} />
          ))}
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
      </ScreenContainer>

      <SafeAreaView
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        edges={['bottom', 'right']}
      >
        <Fab
          label="Abrir catraca"
          icon="qr_code_scanner"
          variant="catraca"
          onPress={onOpenScanner}
        />
      </SafeAreaView>

      <LogoutDialog
        visible={logoutDialogVisible}
        onCancel={onCancelLogout}
        onConfirm={onConfirmLogout}
      />
    </View>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Room at the end so the floating "Abrir catraca" never covers the last item.
  content: { gap: 16, paddingBottom: 96 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titles: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { padding: 16, gap: 12 },
  tileWide: { flexDirection: 'row', alignItems: 'center' },
  tileHalf: { flexGrow: 1, flexBasis: '40%', minHeight: 132 },
  tileTexts: { flexShrink: 1, flexGrow: 1, gap: 2 },
  footer: { alignItems: 'center', paddingTop: 8 },
  pressed: { opacity: 0.85 },
});
