import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Circle } from '@/components/shapes';
import {
  EmptyState,
  ErrorState,
  Fab,
  Header,
  ListItem,
  LoadingState,
  ScreenContainer,
} from '@/components/ui';
import { colors, ThemeProvider, useTheme, type ColorName } from '@/theme';
import {
  statusBadge,
  type TerminalStatus,
  type useTerminalsListModel,
} from './terminalsList.model';

type TerminalsListViewProps = ReturnType<typeof useTerminalsListModel> & {
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
};

// The offline terminal stands out in yellow, like its badge (T20).
const iconColors: Record<TerminalStatus, { shape: ColorName; icon: ColorName }> = {
  online: { shape: 'superficieAlta', icon: 'sucesso' },
  offline: { shape: 'aviso', icon: 'acaoSobre' },
  inativo: { shape: 'superficieAlta', icon: 'textoApoio' },
};

const TerminalIcon = ({ status }: { status: TerminalStatus }) => {
  const theme = useTheme();
  const { shape, icon } = iconColors[status];
  return (
    <Circle color={theme.colors[shape]} size={40}>
      <Icon name="tablet_android" size={22} color={theme.colors[icon]} />
    </Circle>
  );
};

// T20 Terminais (Figma "Passe").
export const TerminalsListView = ({
  items,
  status,
  errorMessage,
  onRetry,
  refreshing,
  onRefresh,
  onBack,
  onNew,
  onOpen,
}: TerminalsListViewProps) => (
  <ThemeProvider scale="admin">
    <View style={styles.fill}>
      <ScreenContainer
        scroll={false}
        header={<Header title="Terminais" onBack={onBack} />}
        contentStyle={styles.noPadding}
      >
        <FlatList
          data={items}
          keyExtractor={(item) => item.terminal.id}
          renderItem={({ item }) => (
            <ListItem
              title={item.terminal.nome}
              subtitle={item.place}
              meta={item.seen}
              badge={statusBadge[item.status]}
              leading={<TerminalIcon status={item.status} />}
              onPress={() => onOpen(item.terminal.id)}
            />
          )}
          ListEmptyComponent={
            status === 'loading' ? (
              <LoadingState label="Carregando terminais…" />
            ) : status === 'error' ? (
              <ErrorState
                title="Não foi possível carregar os terminais."
                message={errorMessage}
                onRetry={onRetry}
              />
            ) : (
              <EmptyState
                icon="tablet_android"
                title="Nenhum terminal cadastrado."
                message="Cadastre um para cada catraca ou porta com leitor."
              />
            )
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaria}
              colors={[colors.primaria]}
              progressBackgroundColor={colors.superficieAlta}
            />
          }
        />
      </ScreenContainer>

      <SafeAreaView
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        edges={['bottom', 'right']}
      >
        <Fab label="Novo terminal" icon="add" onPress={onNew} />
      </SafeAreaView>
    </View>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  noPadding: { paddingVertical: 0 },
  // Room at the end so the floating "Novo terminal" never covers the last terminal.
  list: { flexGrow: 1, paddingTop: 8, paddingBottom: 96 },
});
