import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import {
  Avatar,
  Button,
  DateField,
  EmptyState,
  ErrorState,
  Fab,
  FieldRow,
  FilterChip,
  Header,
  ListItem,
  LoadingState,
  ScreenContainer,
  SelectField,
  Text,
  type SelectOption,
} from '@/components/ui';
import { formatPeriod } from '@/lib/dateValue';
import type { Autorizacao } from '@/lib/types/authorizations';
import { colors, ThemeProvider, useTheme } from '@/theme';
import type { SituacaoFilter, useAuthorizationsListModel } from './authorizationsList.model';

type AuthorizationsListViewProps = ReturnType<typeof useAuthorizationsListModel> & {
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
};

const situacoes: { value: SituacaoFilter; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'ATIVA', label: 'Ativas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'EXPIRADA', label: 'Expiradas' },
  { value: 'ESGOTADA', label: 'Esgotadas' },
];

type PersonTriggerProps = { selected?: SelectOption<string>; open: () => void };

/** The search pill of T23: the API filters by person, so it opens the list of people. */
const PersonTrigger = ({ selected, open }: PersonTriggerProps) => {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pessoa"
      accessibilityValue={{ text: selected?.label ?? 'Todas as pessoas' }}
      onPress={open}
      style={({ pressed }) => [
        styles.pill,
        {
          minHeight: theme.sizes.field,
          borderRadius: theme.radius.pilula,
          backgroundColor: theme.colors.superficieAlta,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon name="search" color={theme.colors.textoApoio} />
      <Text color={selected ? 'texto' : 'textoApoio'} style={styles.fill}>
        {selected?.label ?? 'Buscar por pessoa'}
      </Text>
    </Pressable>
  );
};

const periodLine = ({ dataInicio, dataFim, horaInicio, horaFim }: Autorizacao) =>
  `${formatPeriod(dataInicio, dataFim)} · ${horaInicio} às ${horaFim}`;

// T23 Autorizações (Figma "Passe").
export const AuthorizationsListView = ({
  usuarioId,
  accessPointId,
  situacao,
  dataDe,
  dataAte,
  periodOpen,
  hasFilters,
  onChangePessoa,
  onChangeLocal,
  onChangeSituacao,
  onChangeDataDe,
  onChangeDataAte,
  onTogglePeriod,
  onClearFilters,
  personOptions,
  placeOptions,
  authorizations,
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
  onOpen,
}: AuthorizationsListViewProps) => {
  // The filters scroll with the list, so a large system font still leaves room for the items.
  const listHeader = (
    <View style={styles.filters}>
      <SelectField
        label="Pessoa"
        options={personOptions}
        value={usuarioId}
        onChange={onChangePessoa}
        searchable
        searchPlaceholder="Busque pelo nome ou e-mail"
        renderTrigger={PersonTrigger}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {situacoes.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={situacao === option.value}
            onPress={() => onChangeSituacao(option.value)}
          />
        ))}
      </ScrollView>
      <View style={styles.moreFilters}>
        <SelectField
          label="Local"
          options={placeOptions}
          value={accessPointId}
          onChange={onChangeLocal}
          searchable={placeOptions.length > 6}
          searchPlaceholder="Busque pelo local ou edifício"
          renderTrigger={({ selected, open }) => (
            <FilterChip label={selected?.label ?? 'Local'} selected={!!selected} onPress={open} />
          )}
        />
        <FilterChip
          label="Período"
          selected={periodOpen || !!dataDe || !!dataAte}
          onPress={onTogglePeriod}
        />
        {hasFilters ? (
          <Button
            variant="texto"
            label="Limpar filtros"
            onPress={onClearFilters}
            fullWidth={false}
          />
        ) : null}
      </View>
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
      <LoadingState label="Carregando autorizações…" />
    ) : status === 'error' ? (
      <ErrorState
        title="Não foi possível carregar as autorizações."
        message={errorMessage}
        onRetry={onRetry}
      />
    ) : (
      <EmptyState
        icon="search_off"
        title="Nenhuma autorização encontrada."
        message={hasFilters ? 'Confira os filtros.' : 'Crie a primeira em "Nova autorização".'}
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
      <View style={styles.fill}>
        <ScreenContainer
          scroll={false}
          header={<Header title="Autorizações" onBack={onBack} />}
          contentStyle={styles.content}
        >
          <FlatList
            testID="authorizations-list"
            data={status === 'ready' ? authorizations : []}
            keyExtractor={(authorization) => authorization.id}
            renderItem={({ item }) => (
              <ListItem
                title={item.usuario.nome}
                subtitle={`${item.local.nome}, ${item.local.edificio.nome}`}
                details={[
                  periodLine(item),
                  `Entradas: ${item.usosRealizados} de ${item.usosPermitidos}`,
                ]}
                badge={{ status: item.situacaoEfetiva }}
                leading={<Avatar nome={item.usuario.nome} size={40} />}
                onPress={() => onOpen(item.id)}
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
          <Fab label="Nova autorização" icon="add" onPress={onNew} />
        </SafeAreaView>
      </View>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingVertical: 0 },
  filters: { gap: 8, paddingTop: 8, paddingBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  chips: { gap: 8 },
  moreFilters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  // Room at the end so the floating "Nova autorização" never covers the last item.
  list: { flexGrow: 1, paddingBottom: 96 },
  pressed: { opacity: 0.7 },
});
