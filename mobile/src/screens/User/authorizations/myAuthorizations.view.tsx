import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  ProgressBar,
  ScreenContainer,
  StatusBadge,
  Text,
} from '@/components/ui';
import { colors, radius } from '@/theme';
import type { AuthorizationCardData, useMyAuthorizationsModel } from './myAuthorizations.model';

type MyAuthorizationsViewProps = ReturnType<typeof useMyAuthorizationsModel> & {
  onBack: () => void;
  onOpenScanner: () => void;
};

// From this system font size on, the badge goes under the name instead of squeezing it.
const STACK_FONT_SCALE = 1.3;

const InfoLine = ({ icon, text }: { icon: IconName; text: string }) => (
  <View style={styles.infoLine}>
    <Icon name={icon} color={colors.textoApoio} />
    <Text style={styles.fill}>{text}</Text>
  </View>
);

const AuthorizationCard = ({ card }: { card: AuthorizationCardData }) => {
  const stacked = useWindowDimensions().fontScale >= STACK_FONT_SCALE;

  return (
    <Card testID={`authorization-card-${card.local}`} style={styles.card}>
      <View style={!stacked && styles.titleRow}>
        <View style={styles.fill}>
          <Text variant="pessoaDestaque">{card.local}</Text>
          <Text variant="pessoaApoio" color="textoApoio">
            {card.edificio}
          </Text>
        </View>
        <View style={stacked && styles.stackedBadge}>
          <StatusBadge status={card.situacao} withIcon />
        </View>
      </View>

      <InfoLine icon="calendar_month" text={card.validade} />
      <InfoLine icon="schedule" text={card.horario} />
      {card.foraDoHorario ? (
        <Alert tone="aviso" icon="schedule" message="Agora está fora do horário permitido." />
      ) : null}

      <View style={styles.usesRow}>
        <Text variant="pessoaApoio" color="textoApoio">
          Entradas
        </Text>
        <Text variant="pessoaCorpoForte">{card.entradas}</Text>
      </View>
      {card.situacao === 'ATIVA' ? (
        <ProgressBar
          value={card.usosRestantes}
          total={card.usosPermitidos}
          accessibilityLabel="Entradas restantes"
        />
      ) : null}
    </Card>
  );
};

type AnterioresToggleProps = { total: number; open: boolean; onPress: () => void };

const AnterioresToggle = ({ total, open, onPress }: AnterioresToggleProps) => {
  const label = `${open ? 'Ocultar' : 'Ver'} anteriores (${total})`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
    >
      <Text variant="pessoaCorpoForte" color="primaria">
        {label}
      </Text>
      <Icon name="expand_more" color={colors.primaria} style={open && styles.flipped} />
    </Pressable>
  );
};

// T04 Minhas autorizações (Figma "Passe"). The cards do not open: T05 is an extra of the step.
export const MyAuthorizationsView = ({
  status,
  ativas,
  anteriores,
  anterioresOpen,
  onToggleAnteriores,
  errorMessage,
  onRetry,
  refreshing,
  onRefresh,
  onBack,
  onOpenScanner,
}: MyAuthorizationsViewProps) => (
  <ScreenContainer
    scroll={false}
    header={<Header title="Minhas autorizações" onBack={onBack} />}
    footer={
      <Button
        variant="catraca"
        icon="qr_code_scanner"
        label="Abrir catraca"
        onPress={onOpenScanner}
      />
    }
    contentStyle={styles.content}
  >
    <ScrollView
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
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
      {status === 'loading' ? <LoadingState label="Carregando autorizações…" /> : null}
      {status === 'error' ? (
        <ErrorState
          title="Não foi possível carregar suas autorizações."
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : null}
      {status === 'empty' ? (
        <EmptyState
          icon="confirmation_number"
          title="Você ainda não tem autorizações."
          message="Procure a administração."
        />
      ) : null}
      {status === 'ready' ? (
        <>
          <Text variant="pessoaRotulo" color="primaria" accessibilityRole="header">
            Ativas
          </Text>
          {ativas.length === 0 ? (
            <Text color="textoApoio">Nenhuma autorização ativa agora.</Text>
          ) : null}
          {ativas.map((card) => (
            <AuthorizationCard key={card.id} card={card} />
          ))}
          {anteriores.length > 0 ? (
            <AnterioresToggle
              total={anteriores.length}
              open={anterioresOpen}
              onPress={onToggleAnteriores}
            />
          ) : null}
          {anterioresOpen
            ? anteriores.map((card) => <AuthorizationCard key={card.id} card={card} />)
            : null}
        </>
      ) : null}
    </ScrollView>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingVertical: 0 },
  list: { flexGrow: 1, gap: 12, paddingVertical: 8 },
  card: { gap: 12, borderRadius: radius.cartaoGrande },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stackedBadge: { marginTop: 8 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  flipped: { transform: [{ rotate: '180deg' }] },
  pressed: { opacity: 0.7 },
});
