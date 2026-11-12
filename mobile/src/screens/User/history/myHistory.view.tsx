import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  ScreenContainer,
} from '@/components/ui';
import { AccessEventRow } from '@/screens/Admin/history/AccessEventRow';
import { colors } from '@/theme';
import type { useMyHistoryModel } from './myHistory.model';

type MyHistoryViewProps = ReturnType<typeof useMyHistoryModel> & { onBack: () => void };

// T12 Meu histórico (Figma "Passe"): the person's own attempts, newest first.
export const MyHistoryView = ({
  events,
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
}: MyHistoryViewProps) => {
  const emptyContent =
    status === 'loading' ? (
      <LoadingState label="Carregando suas tentativas…" />
    ) : status === 'error' ? (
      <ErrorState
        title="Não foi possível carregar o histórico."
        message={errorMessage}
        onRetry={onRetry}
      />
    ) : (
      <EmptyState
        icon="history"
        title="Nenhuma tentativa ainda."
        message='Suas entradas aparecem aqui depois de usar "Abrir catraca" ou a tag.'
      />
    );

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
    <ScreenContainer
      scroll={false}
      header={<Header title="Meu histórico" onBack={onBack} />}
      contentStyle={styles.content}
    >
      <FlatList
        data={status === 'ready' ? events : []}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => <AccessEventRow event={item} perspective="pessoa" />}
        ListEmptyComponent={emptyContent}
        ListFooterComponent={footer}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
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
  );
};

const styles = StyleSheet.create({
  content: { paddingVertical: 0 },
  list: { flexGrow: 1, paddingBottom: 24 },
});
