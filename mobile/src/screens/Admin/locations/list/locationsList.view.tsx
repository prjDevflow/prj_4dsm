import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Arch, Circle } from '@/components/shapes';
import {
  Card,
  EmptyState,
  ErrorState,
  Fab,
  Header,
  ListItem,
  LoadingState,
  NavRow,
  ScreenContainer,
  StatusBadge,
  Text,
  type StatusBadgeProps,
} from '@/components/ui';
import type { Edificio, PontoDeAcesso } from '@/lib/types/locations';
import { colors, ThemeProvider, useTheme } from '@/theme';
import { tipoIcons, tipoLabels } from '../locationsQueries';
import type { useLocationsListModel } from './locationsList.model';

type LocationsListViewProps = ReturnType<typeof useLocationsListModel> & {
  onBack: () => void;
  onOpenTerminals: () => void;
  onNewBuilding: () => void;
  onEditBuilding: (id: string) => void;
  onNewAccessPoint: (buildingId: string) => void;
  onEditAccessPoint: (id: string) => void;
};

const activeBadge = (ativo: boolean): StatusBadgeProps =>
  ativo ? { tone: 'sucesso', label: 'Ativo' } : { status: 'INATIVO' };

const terminalsDetail = (count: number, offline: number) =>
  count === 0
    ? 'Nenhum terminal'
    : `${count} ${count === 1 ? 'terminal' : 'terminais'}, ${offline} offline`;

type BuildingCardProps = {
  building: Edificio;
  points: PontoDeAcesso[];
  onEdit: () => void;
  onAddPoint: () => void;
  onEditPoint: (id: string) => void;
};

const BuildingCard = ({ building, points, onEdit, onAddPoint, onEditPoint }: BuildingCardProps) => {
  const theme = useTheme();

  return (
    <Card testID={`building-${building.id}`} style={styles.card}>
      <View style={styles.cardHeader}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Arch color={theme.colors.areaLocais} size={40}>
            <Icon name="apartment" size={22} color={theme.colors.areaLocaisSobre} />
          </Arch>
        </View>
        <View style={styles.fill}>
          <Text variant="adminItem">{building.nome}</Text>
          <Text variant="adminApoio" color="textoApoio">
            {building.endereco}
          </Text>
        </View>
        {/* Only an inactive building shows its state; active is the normal case. */}
        {building.ativo ? null : <StatusBadge status="INATIVO" />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${building.nome}`}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.iconButton,
            { minWidth: theme.sizes.touchMin, minHeight: theme.sizes.touchMin },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="edit" color={theme.colors.textoApoio} />
        </Pressable>
      </View>

      {points.map((point) => (
        <ListItem
          key={point.id}
          title={point.nome}
          subtitle={`${tipoLabels[point.tipo]}, ${point.identificacao}`}
          badge={activeBadge(point.ativo)}
          leading={
            <Circle color={theme.colors.superficieAlta} size={40}>
              <Icon name={tipoIcons[point.tipo]} size={22} color={theme.colors.texto} />
            </Circle>
          }
          onPress={() => onEditPoint(point.id)}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Adicionar local ao ${building.nome}`}
        onPress={onAddPoint}
        style={({ pressed }) => [
          styles.addPoint,
          { minHeight: theme.sizes.touchMin },
          pressed && styles.pressed,
        ]}
      >
        <Icon name="add" size={20} color={theme.colors.primaria} />
        <Text variant="adminBotao" color="primaria">
          Adicionar local
        </Text>
      </Pressable>
    </Card>
  );
};

// T17 Locais e terminais (Figma "Passe").
export const LocationsListView = ({
  status,
  groups,
  terminalCount,
  offlineCount,
  errorMessage,
  onRetry,
  refreshing,
  onRefresh,
  onBack,
  onOpenTerminals,
  onNewBuilding,
  onEditBuilding,
  onNewAccessPoint,
  onEditAccessPoint,
}: LocationsListViewProps) => (
  <ThemeProvider scale="admin">
    <View style={styles.fill}>
      <ScreenContainer
        scroll={false}
        header={<Header title="Locais e terminais" onBack={onBack} />}
        contentStyle={styles.noPadding}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaria}
              colors={[colors.primaria]}
              progressBackgroundColor={colors.superficieAlta}
            />
          }
        >
          {status === 'loading' ? <LoadingState label="Carregando locais…" /> : null}
          {status === 'error' ? (
            <ErrorState
              title="Não foi possível carregar os locais."
              message={errorMessage}
              onRetry={onRetry}
            />
          ) : null}
          {status === 'empty' || status === 'ready' ? (
            <NavRow
              icon="tablet_android"
              label="Terminais"
              detail={terminalsDetail(terminalCount, offlineCount)}
              badge={
                offlineCount > 0 ? { tone: 'aviso', label: `${offlineCount} offline` } : undefined
              }
              onPress={onOpenTerminals}
            />
          ) : null}
          {status === 'empty' ? (
            <EmptyState
              icon="apartment"
              title="Nenhum edifício cadastrado."
              message="Comece pelo edifício; depois cadastre os locais de acesso dele."
            />
          ) : null}
          {groups.map(({ building, points }) => (
            <BuildingCard
              key={building.id}
              building={building}
              points={points}
              onEdit={() => onEditBuilding(building.id)}
              onAddPoint={() => onNewAccessPoint(building.id)}
              onEditPoint={onEditAccessPoint}
            />
          ))}
        </ScrollView>
      </ScreenContainer>

      <SafeAreaView
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        edges={['bottom', 'right']}
      >
        <Fab label="Novo edifício" icon="add_business" onPress={onNewBuilding} />
      </SafeAreaView>
    </View>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  noPadding: { paddingVertical: 0 },
  // Room at the end so the floating "Novo edifício" never covers the last place.
  content: { gap: 16, paddingTop: 8, paddingBottom: 96 },
  card: { gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  addPoint: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
