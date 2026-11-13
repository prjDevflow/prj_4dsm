import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import {
  Button,
  EmptyState,
  ErrorState,
  Fab,
  Header,
  LoadingState,
  ScreenContainer,
  SelectField,
  StatusBadge,
  Text,
  type SelectOption,
} from '@/components/ui';
import { maskUid } from '@/lib/nfcUid';
import type { TagNfc } from '@/lib/types/nfcTags';
import { colors, ThemeProvider, useTheme } from '@/theme';
import type { useTagsListModel } from './tagsList.model';

type TagsListViewProps = ReturnType<typeof useTagsListModel> & {
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
};

type PersonTriggerProps = { selected?: SelectOption<string>; open: () => void };

/** The search pill: the API filters by person, so it opens the list of people. */
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

type TagRowProps = { tag: TagNfc; pessoa: string; onPress: () => void };

// One tag: the code shows only its end (the detail shows it whole).
const TagRow = ({ tag, pessoa, onPress }: TagRowProps) => {
  const theme = useTheme();
  const { colors: palette } = theme;
  const status = tag.ativa ? 'Ativa' : 'Inativa';
  const label = [`Tag terminada em ${tag.uid.slice(-4)}`, pessoa, tag.descricao, status]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Cookie12 color={tag.ativa ? palette.areaTagsSobre : palette.superficieMaxima} size={40}>
          <Icon name="nfc" size={20} color={tag.ativa ? palette.areaTags : palette.textoApoio} />
        </Cookie12>
      </View>
      <View style={[styles.body, { borderBottomColor: palette.contornoSuave }]}>
        <View style={styles.top}>
          <Text variant="adminItem" style={[styles.fill, styles.code]}>
            {maskUid(tag.uid)}
          </Text>
          <StatusBadge
            {...(tag.ativa ? { status: 'ATIVA' as const } : { tone: 'neutro', label: 'Inativa' })}
          />
        </View>
        {pessoa ? (
          <Text variant="adminCorpo" color="textoApoio">
            {pessoa}
          </Text>
        ) : null}
        {tag.descricao ? (
          <Text variant="adminApoio" style={{ fontFamily: theme.fontFamily.bold }}>
            {tag.descricao}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

// T28 Tags NFC (Figma "Passe").
export const TagsListView = ({
  usuarioId,
  hasFilters,
  onChangePessoa,
  onClearFilters,
  personOptions,
  items,
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
}: TagsListViewProps) => {
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
    </View>
  );

  const emptyContent =
    status === 'loading' ? (
      <LoadingState label="Carregando tags…" />
    ) : status === 'error' ? (
      <ErrorState
        title="Não foi possível carregar as tags."
        message={errorMessage}
        onRetry={onRetry}
      />
    ) : (
      <EmptyState
        icon="nfc"
        title={hasFilters ? 'Esta pessoa ainda não tem tags.' : 'Nenhuma tag vinculada.'}
        message='Toque em "Vincular tag" para cadastrar uma.'
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
          header={<Header title="Tags NFC" onBack={onBack} />}
          contentStyle={styles.content}
        >
          <FlatList
            data={status === 'ready' ? items : []}
            keyExtractor={(item) => item.tag.id}
            renderItem={({ item }) => (
              <TagRow tag={item.tag} pessoa={item.pessoa} onPress={() => onOpen(item.tag.id)} />
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
        <SafeAreaView
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
          edges={['bottom', 'right']}
        >
          <Fab label="Vincular tag" icon="add_link" onPress={onNew} />
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
  clear: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingTop: 12 },
  body: { flex: 1, gap: 2, paddingBottom: 12, borderBottomWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  code: { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  // Room at the end so the floating "Vincular tag" never covers the last item.
  list: { flexGrow: 1, paddingBottom: 96 },
  pressed: { opacity: 0.7 },
});
