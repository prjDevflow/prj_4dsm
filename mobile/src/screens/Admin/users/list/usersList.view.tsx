import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Fab,
  FilterChip,
  Header,
  ListItem,
  LoadingState,
  ScreenContainer,
  SearchField,
  SwitchField,
  type StatusBadgeProps,
} from '@/components/ui';
import { perfilLabel } from '@/lib/perfil';
import type { UsuarioCompleto } from '@/lib/types/users';
import { colors, ThemeProvider } from '@/theme';
import type { PerfilFilter, useUsersListModel } from './usersList.model';

type UsersListViewProps = ReturnType<typeof useUsersListModel> & {
  onBack: () => void;
  onNew: () => void;
  onOpenUser: (id: string) => void;
};

const filters: { value: PerfilFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ADMIN', label: perfilLabel('ADMIN') },
  { value: 'CONDOMINO', label: perfilLabel('CONDOMINO') },
  { value: 'VISITANTE', label: perfilLabel('VISITANTE') },
];

// The administrator's badge stands out; the others are neutral (T15).
const badges = (user: UsuarioCompleto): StatusBadgeProps[] => [
  { tone: user.perfil === 'ADMIN' ? 'primario' : 'neutro', label: perfilLabel(user.perfil) },
  ...(user.ativo ? [] : [{ status: 'INATIVO' as const }]),
];

// T15 Lista de usuários (Figma "Passe").
export const UsersListView = ({
  search,
  onChangeSearch,
  perfil,
  onChangePerfil,
  showInactive,
  onToggleInactive,
  users,
  status,
  errorMessage,
  onRetry,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  loadMoreFailed,
  onRetryLoadMore,
  onBack,
  onNew,
  onOpenUser,
}: UsersListViewProps) => {
  // The filters scroll with the list, so a large system font still leaves room for the people.
  const listHeader = (
    <View style={styles.filters}>
      <SearchField
        label="Buscar por nome ou e-mail"
        value={search}
        onChangeText={onChangeSearch}
        autoCapitalize="none"
        maxLength={120}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {filters.map((filter) => (
          <FilterChip
            key={filter.value}
            label={filter.label}
            selected={perfil === filter.value}
            onPress={() => onChangePerfil(filter.value)}
          />
        ))}
      </ScrollView>
      <SwitchField
        label="Mostrar usuários inativos"
        value={showInactive}
        onValueChange={onToggleInactive}
      />
    </View>
  );

  const emptyContent =
    status === 'loading' ? (
      <LoadingState label="Carregando usuários…" />
    ) : status === 'error' ? (
      <ErrorState
        title="Não foi possível carregar os usuários."
        message={errorMessage}
        onRetry={onRetry}
      />
    ) : status === 'empty' ? (
      <EmptyState
        icon="search_off"
        title="Nenhum usuário encontrado."
        message="Confira a busca e os filtros."
      />
    ) : undefined;

  const footer = loadingMore ? (
    <LoadingState label="Carregando mais…" />
  ) : loadMoreFailed ? (
    <Button
      variant="contorno"
      label="Tentar carregar mais"
      onPress={onRetryLoadMore}
      fullWidth={false}
    />
  ) : undefined;

  return (
    <ThemeProvider scale="admin">
      <View style={styles.fill}>
        <ScreenContainer
          scroll={false}
          header={<Header title="Usuários" onBack={onBack} />}
          contentStyle={styles.content}
        >
          <FlatList
            data={status === 'ready' ? users : []}
            keyExtractor={(user) => user.id}
            renderItem={({ item }) => (
              <ListItem
                title={item.nome}
                subtitle={item.email}
                badge={badges(item)}
                leading={<Avatar nome={item.nome} size={40} />}
                onPress={() => onOpenUser(item.id)}
              />
            )}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyContent}
            ListFooterComponent={footer}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
          <Fab label="Novo usuário" icon="person_add" onPress={onNew} />
        </SafeAreaView>
      </View>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingVertical: 0 },
  filters: { gap: 8, paddingTop: 8, paddingBottom: 8 },
  chips: { gap: 8 },
  // Room at the end so the floating "Novo usuário" never covers the last person.
  list: { flexGrow: 1, paddingBottom: 96 },
});
