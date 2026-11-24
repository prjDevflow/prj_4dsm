import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { Button, EmptyState, Header, ScreenContainer, Text } from '@/components/ui';
import {
  accessReasonLabel,
  formatEventDateTime,
  metodoIcons,
  metodoLabels,
} from '@/lib/accessEvents';
import type { EventoDeAcesso } from '@/lib/types/accessEvents';
import { ThemeProvider, useTheme } from '@/theme';

type AccessEventDetailViewProps = {
  event: EventoDeAcesso | null;
  onBack: () => void;
  onOpenAuthorization: (id: string) => void;
};

const UNKNOWN = 'Não identificado';

type FieldProps = { label: string; value: string; icon?: Parameters<typeof Icon>[0]['name'] };

const Field = ({ label, value, icon }: FieldProps) => {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.field, { borderBottomColor: colors.contornoSuave }]}
    >
      <Text variant="adminApoio" color="textoApoio">
        {label}
      </Text>
      <View style={styles.value}>
        {icon ? <Icon name={icon} size={18} color={colors.textoApoio} /> : null}
        <Text variant="adminItem" style={styles.fill}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const Detail = ({
  event,
  onOpenAuthorization,
}: { event: EventoDeAcesso } & Pick<AccessEventDetailViewProps, 'onOpenAuthorization'>) => {
  const theme = useTheme();
  const { colors } = theme;
  const denied = event.resultado === 'NEGADO';
  const { authorizationId } = event;

  return (
    <>
      <View accessible style={styles.result}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Cookie12 color={denied ? colors.erro : colors.sucesso} size={72}>
            <Icon
              name={denied ? 'close' : 'check'}
              size={36}
              color={denied ? colors.erroSobre : colors.sucessoSobre}
            />
          </Cookie12>
        </View>
        <View style={styles.fill}>
          <Text variant="adminTitulo">{denied ? 'Negado' : 'Autorizado'}</Text>
          {denied ? (
            <Text variant="adminCorpo" color="erro" style={{ fontFamily: theme.fontFamily.bold }}>
              {accessReasonLabel(event.motivo)}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.superficieBaixa, borderRadius: theme.radius.cartao },
        ]}
      >
        <Field label="Pessoa" value={event.usuario?.nome ?? UNKNOWN} />
        <Field
          label="Local"
          value={event.local ? `${event.local.nome}, ${event.local.edificio.nome}` : UNKNOWN}
        />
        <Field label="Método" value={metodoLabels[event.metodo]} icon={metodoIcons[event.metodo]} />
        <Field label="Data e hora" value={formatEventDateTime(event.ocorridoEm)} />
        <Field label="Terminal" value={event.terminal?.nome ?? UNKNOWN} />
        {event.distanciaM !== null ? (
          <Field label="Distância" value={`${Math.round(event.distanciaM)} m`} />
        ) : null}
      </View>

      {authorizationId ? (
        <Button
          variant="contorno"
          icon="confirmation_number"
          label="Ver autorização"
          onPress={() => onOpenAuthorization(authorizationId)}
        />
      ) : null}
    </>
  );
};

// T27 Tentativa de acesso (Figma "Passe"): every field, plus the distance and the authorization used.
export const AccessEventDetailView = ({
  event,
  onBack,
  onOpenAuthorization,
}: AccessEventDetailViewProps) => (
  <ThemeProvider scale="admin">
    <ScreenContainer header={<Header title="Tentativa de acesso" onBack={onBack} />}>
      {event ? (
        <Detail event={event} onOpenAuthorization={onOpenAuthorization} />
      ) : (
        <EmptyState
          icon="history"
          title="Tentativa não encontrada."
          message="Abra a tentativa pela lista do histórico."
          action={{ label: 'Voltar ao histórico', onPress: onBack }}
        />
      )}
    </ScreenContainer>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  result: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  card: { paddingHorizontal: 16, paddingVertical: 4 },
  field: { gap: 2, paddingVertical: 12, borderBottomWidth: 1 },
  value: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
});
