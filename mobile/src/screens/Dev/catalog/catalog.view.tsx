import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, iconNames } from '@/components/Icon';
import { Arch, Circle, Clover4, Cookie12, Sun8 } from '@/components/shapes';
import {
  Alert,
  Button,
  Card,
  DateField,
  Dialog,
  EmptyState,
  ErrorState,
  Fab,
  FilterChip,
  Header,
  ListItem,
  LoadingState,
  NavRow,
  NumberStepper,
  OfflineBanner,
  PasswordField,
  ProgressBar,
  ScreenContainer,
  SelectField,
  StatusBadge,
  SwitchField,
  Text,
  TextField,
  TimeField,
  type BadgeStatus,
  type ButtonVariant,
} from '@/components/ui';
import { colors, ThemeProvider, typography, type ColorName, type TextVariant } from '@/theme';
import type { useCatalogModel } from './catalog.model';

type CatalogViewProps = ReturnType<typeof useCatalogModel> & { onBack: () => void };

const buttonVariants: [ButtonVariant, string][] = [
  ['principal', 'Principal'],
  ['tonal', 'Tonal'],
  ['contorno', 'Contorno'],
  ['texto', 'Texto'],
  ['perigo', 'Perigo'],
  ['perigoContorno', 'Perigo contorno'],
  ['catraca', 'Abrir catraca'],
];

const badgeStatuses: BadgeStatus[] = [
  'ATIVA',
  'CANCELADA',
  'EXPIRADA',
  'ESGOTADA',
  'ONLINE',
  'OFFLINE',
  'INATIVO',
  'AUTORIZADO',
  'NEGADO',
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text variant="pessoaDestaque" color="primaria" accessibilityRole="header">
      {title}
    </Text>
    {children}
  </View>
);

const Row = ({ children }: { children: ReactNode }) => <View style={styles.row}>{children}</View>;

const noop = () => {};

export const CatalogView = ({
  onBack,
  scale,
  onToggleAdmin,
  nome,
  email,
  senha,
  perfil,
  local,
  dataInicio,
  horaInicio,
  entradas,
  mostrarInativos,
  filtros,
  filtro,
  onSelectFiltro,
  saving,
  onSave,
  onShowToast,
  dialog,
}: CatalogViewProps) => (
  <ThemeProvider scale={scale}>
    <ScreenContainer header={<Header title="Catálogo de componentes" onBack={onBack} />}>
      <Text color="textoApoio">
        Só aparece em desenvolvimento. Use para revisar os componentes com o Rafael e conferir a
        fonte do celular no máximo.
      </Text>
      <SwitchField
        label="Escala do administrador"
        help="Desligado: escala da pessoa (corpo 18, botão 60)."
        value={scale === 'admin'}
        onValueChange={onToggleAdmin}
      />

      <Section title="Cores">
        <View style={styles.swatches}>
          {(Object.keys(colors) as ColorName[]).map((name) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[
                  styles.swatchColor,
                  { backgroundColor: colors[name], borderColor: colors.contornoSuave },
                ]}
              />
              <Text variant="adminLegenda">{name}</Text>
              <Text variant="adminLegenda" color="textoApoio">
                {colors[name]}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Tipografia">
        {(Object.keys(typography) as TextVariant[]).map((variant) => (
          <Text key={variant} variant={variant}>
            {variant}: Catraca Social
          </Text>
        ))}
      </Section>

      <Section title="Formas">
        <Row>
          <Cookie12 color={colors.primaria} size={64} />
          <Clover4 color={colors.areaUsuariosSobre} size={64} />
          <Arch color={colors.areaLocaisSobre} size={64} />
          <Sun8 color={colors.areaTagsSobre} size={64} />
          <Circle color={colors.areaHistoricoSobre} size={64} />
        </Row>
      </Section>

      <Section title="Ícones">
        <View style={styles.icons}>
          {iconNames.map((name) => (
            <View key={name} style={styles.icon}>
              <Icon name={name} />
              <Text variant="adminLegenda" color="textoApoio">
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Botões">
        {buttonVariants.map(([variant, label]) => (
          <Button key={variant} variant={variant} label={label} onPress={noop} />
        ))}
        <Button label="Salvar" loadingLabel="Salvando…" loading={saving} onPress={onSave} />
        <Button label="Desabilitado" disabled onPress={noop} />
        <Fab label="Novo usuário" icon="person_add" onPress={noop} floating={false} />
        <Fab
          label="Abrir catraca"
          icon="qr_code_scanner"
          variant="catraca"
          onPress={noop}
          floating={false}
        />
      </Section>

      <Section title="Campos">
        <TextField
          label="Nome completo"
          value={nome.value}
          onChangeText={nome.onChangeText}
          error={nome.error}
        />
        <TextField
          label="E-mail"
          placeholder="nome@email.com"
          help="Use o e-mail do cadastro."
          keyboardType="email-address"
          autoCapitalize="none"
          value={email.value}
          onChangeText={email.onChangeText}
        />
        <TextField label="Identificação" value="CATRACA-SOCIAL" readOnly />
        <PasswordField
          label="Senha"
          help="De 8 a 72 caracteres."
          value={senha.value}
          onChangeText={senha.onChangeText}
        />
        <SelectField label="Perfil" {...perfil} />
        <SelectField
          label="Local de acesso"
          searchable
          searchPlaceholder="Busque pelo nome do local"
          {...local}
        />
        <DateField label="Início" {...dataInicio} />
        <TimeField label="Das" {...horaInicio} />
        <NumberStepper label="Entradas" {...entradas} />
        <SwitchField label="Mostrar usuários inativos" {...mostrarInativos} />
      </Section>

      <Section title="Filtros e selos">
        <Row>
          {filtros.map((label) => (
            <FilterChip
              key={label}
              label={label}
              selected={label === filtro}
              onPress={() => onSelectFiltro(label)}
            />
          ))}
        </Row>
        <Row>
          {badgeStatuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
          <StatusBadge tone="primario" label="Administrador" />
        </Row>
      </Section>

      <Section title="Cartões e listas">
        <Card>
          <Text variant="pessoaApoio" color="textoApoio">
            Local
          </Text>
          <Text variant="pessoaCorpoForte">Catraca Social, Edifício Central</Text>
          <Text variant="pessoaApoio" color="textoApoio">
            Entradas: 1 de 3 usadas
          </Text>
          <ProgressBar value={1} total={3} accessibilityLabel="Entradas usadas" />
        </Card>
        <Card tone="container" accessibilityLabel="Catraca Social, válida até 18:00" onPress={noop}>
          <Text variant="pessoaLocal" color="primariaContainerSobre">
            Catraca Social
          </Text>
          <Text color="primariaContainerApoio">Hoje até 18:00</Text>
        </Card>
        <NavRow
          icon="tablet_android"
          label="Terminais"
          detail="4 terminais, 1 offline"
          onPress={noop}
        />
        <ListItem
          leading={
            <Circle color={colors.primariaContainer} size={48}>
              <Text variant="adminItem" color="primariaContainerSobre">
                MS
              </Text>
            </Circle>
          }
          title="Maria Souza"
          subtitle="maria.souza@email.com"
          badge={{ tone: 'neutro', label: 'Condômino' }}
          onPress={noop}
        />
        <ListItem
          title="Catraca Social"
          subtitle="QR Code · 14:32"
          badge={{ status: 'AUTORIZADO' }}
        />
      </Section>

      <Section title="Avisos e diálogos">
        <Alert tone="info" icon="lock_clock" message="Sua sessão expirou. Entre novamente." />
        <Alert tone="aviso" message="Fora do horário permitido para esta autorização." />
        <Alert tone="erro" message="E-mail ou senha incorretos. Confira e tente de novo." />
        <Alert tone="sucesso" message="Tag vinculada à Maria Souza." />
        <Button variant="perigoContorno" label="Cancelar autorização" onPress={dialog.onOpen} />
        <Button variant="tonal" label="Mostrar aviso curto" onPress={onShowToast} />
        <Dialog
          visible={dialog.visible}
          title="Cancelar esta autorização?"
          message="Isso não pode ser desfeito."
          confirmLabel="Cancelar"
          cancelLabel="Voltar"
          destructive
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
        />
      </Section>

      <Section title="Estados (T31)">
        <LoadingState />
        <EmptyState
          icon="search_off"
          title="Nenhum usuário encontrado."
          message="Tente outro nome ou limpe os filtros."
          action={{ label: 'Limpar filtros', onPress: noop }}
        />
        <ErrorState onRetry={noop} />
        <ErrorState
          icon="hourglass_disabled"
          tone="neutro"
          title="O servidor demorou para responder."
          onRetry={noop}
        />
        <ErrorState
          icon="no_photography"
          tone="primario"
          title="Sem acesso à câmera, não é possível ler o QR Code."
          retryLabel="Abrir configurações"
          onRetry={noop}
        />
        <OfflineBanner onRetry={noop} />
      </Section>
    </ScreenContainer>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  section: { gap: 16, paddingTop: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 104, gap: 4 },
  swatchColor: { height: 48, borderRadius: 12, borderWidth: 1 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  icon: { width: 104, alignItems: 'center', gap: 4 },
});
