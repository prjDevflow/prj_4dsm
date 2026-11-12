import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  DateField,
  EmptyState,
  ErrorState,
  FieldRow,
  FilterChip,
  Header,
  LoadingState,
  ScreenContainer,
  SelectField,
} from '@/components/ui';
import { colors, ThemeProvider } from '@/theme';
import { AccessEventRow } from '../AccessEventRow';
import type { MetodoFilter, ResultadoFilter, useAccessHistoryModel } from './accessHistory.model';

type AccessHistoryViewProps = ReturnType<typeof useAccessHistoryModel> & {
  onBack: () => void;
  onOpen: (id: string) => void;
};

const metodos: { value: MetodoFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'QR', label: 'QR Code' },
  { value: 'NFC', label: 'NFC' },
];

const resultados: { value: ResultadoFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'AUTORIZADO', label: 'Autorizado' },
  { value: 'NEGADO', label: 'Negado' },
];

type TriggerProps = { selected?: { value: string; label: string }; open: () => void };

/** A select that opens from a chip; "Todos" reads as the filter's own name. */
const chipTrigger = (name: string, allValue?: string) => {
  const ChipTrigger = ({ selected, open }: TriggerProps) => {
    const active = !!selected && selected.value !== allValue;
    return <FilterChip label={active ? selected.label : name} selected={active} onPress={open} />;
  };
  return ChipTrigger;
};

// T26 Histórico (Figma "Passe").
export const AccessHistoryView = ({
  usuarioId,
  accessPointId,
  metodo,
  resultado,
  motivo,
  dataDe,
  dataAte,
  periodOpen,
  periodLabel,
  isDefaultPeriod,
  hasFilters,
  onChangePessoa,
  onChangeLocal,
  onChangeMetodo,
  onChangeResultado,
  onChangeMotivo,
  onChangeDataDe,
  onChangeDataAte,
  onTogglePeriod,
  onClearFilters,
  personOptions,
  placeOptions,
  reasonOptions,
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
  onOpen,
}: AccessHistoryViewProps) => {
  // The filters scroll with the list, so a large system font still leaves room for the items.
  const listHeader = (
    <View style={styles.filters}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        <FilterChip
          label={periodLabel}
          accessibilityLabel={`Período: ${periodLabel}`}
          selected={periodOpen || isDefaultPeriod || !!dataDe || !!dataAte}
          onPress={onTogglePeriod}
        />
        <SelectField
          label="Resultado"
          options={resultados}
          value={resultado}
          onChange={onChangeResultado}
          renderTrigger={chipTrigger('Resultado', 'TODOS')}
        />
        <SelectField
          label="Pessoa"
          options={personOptions}
          value={usuarioId}
          onChange={onChangePessoa}
          searchable
          searchPlaceholder="Busque pelo nome ou e-mail"
          renderTrigger={chipTrigger('Pessoa')}
        />
        <SelectField
          label="Local"
          options={placeOptions}
          value={accessPointId}
          onChange={onChangeLocal}
          searchable={placeOptions.length > 6}
          searchPlaceholder="Busque pelo local ou edifício"
          renderTrigger={chipTrigger('Local')}
        />
        <SelectField
          label="Método"
          options={metodos}
          value={metodo}
          onChange={onChangeMetodo}
          renderTrigger={chipTrigger('Método', 'TODOS')}
        />
        <SelectField
          label="Motivo"
          options={reasonOptions}
          value={motivo}
          onChange={onChangeMotivo}
          renderTrigger={chipTrigger('Motivo')}
        />
      </ScrollView>
      {hasFilters ? (
        <View style={styles.clear}>
          <Button
            variant="texto"
            label="Limpar filtros"
            onPress={onClearFilters}
            fullWidth={false}
          />
        </View>
      ) : null}
      {periodOpen ? (
        <FieldRow>
          <DateField
            label="De"
            value={dataDe}
            onChange={onChangeDataDe}
            maximumDate={dataAte ?? undefined}
          />
          <DateField
            label="Até"
            value={dataAte}
            onChange={onChangeDataAte}
            minimumDate={dataDe ?? undefined}
          />
        </FieldRow>
      ) : null}
    </View>
  );

  const emptyContent =
    status === 'loading' ? (
      <LoadingState label="Carregando tentativas…" />
    ) : status === 'error' ? (
      <ErrorState
        title="Não foi possível carregar o histórico."
        message={errorMessage}
        onRetry={onRetry}
      />
    ) : (
      <EmptyState
        icon="history"
        title="Nenhuma tentativa no período."
        message={hasFilters ? 'Confira os filtros.' : 'Puxe a lista para atualizar.'}
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
    <ThemeProvider scale="admin">
      <ScreenContainer
        scroll={false}
        header={<Header title="Histórico" onBack={onBack} />}
        contentStyle={styles.content}
      >
        <FlatList
          testID="access-history"
          data={status === 'ready' ? events : []}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => (
            <AccessEventRow event={item} perspective="admin" onPress={() => onOpen(item.id)} />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyContent}
          ListFooterComponent={footer}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
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
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  content: { paddingVertical: 0 },
  filters: { gap: 8, paddingTop: 8, paddingBottom: 8 },
  chips: { gap: 8 },
  clear: { alignItems: 'flex-start' },
  list: { flexGrow: 1, paddingBottom: 24 },
});
