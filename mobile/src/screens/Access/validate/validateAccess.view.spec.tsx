import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StatusBar } from 'expo-status-bar';
import { AccessibilityInfo, Animated } from 'react-native';
import { toMaterialIconName, type IconName } from '@/components/Icon';
import { denialReasons, type DenialReason } from '@/lib/denialReasons';
import { colors } from '@/theme';
import type { AccessResult, ValidateStage } from './validateAccess.model';
import { ValidateAccessView } from './validateAccess.view';

jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));

const granted: AccessResult = {
  tipo: 'AUTORIZADO',
  local: 'Catraca Social',
  usosRestantes: 2,
  ocorridoEm: '2026-10-20T14:32:07Z',
};

type RenderOptions = { stage?: ValidateStage; located?: boolean; result?: AccessResult | null };

const renderScreen = async ({
  stage = 'result',
  located = true,
  result = null,
}: RenderOptions = {}) => {
  const actions = {
    onAllow: jest.fn(async () => {}),
    onOpenSettings: jest.fn(async () => {}),
    onBack: jest.fn(),
    onDone: jest.fn(),
    onReadAgain: jest.fn(),
    onSeeAuthorizations: jest.fn(),
  };
  await render(<ValidateAccessView stage={stage} located={located} result={result} {...actions} />);
  return actions;
};

// The icon is decorative for the screen reader: the title and the text say the same.
const resultIcon = () => screen.getByTestId('result-icon', { includeHiddenElements: true });

const glyphOf = (name: IconName) =>
  String.fromCodePoint(Number(MaterialIcons.glyphMap[toMaterialIconName(name)]));

const location = 'Precisamos da sua localização para confirmar que você está perto da catraca.';

describe('Permissão de localização (T08)', () => {
  it('explica antes do pedido do sistema, com "Permitir localização" e "Agora não"', async () => {
    const { onAllow, onBack } = await renderScreen({ stage: 'ask' });

    expect(screen.getByRole('header', { name: location })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Permitir localização' }));
    expect(onAllow).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('negada, mantém a explicação e mostra o caminho para as configurações', async () => {
    const { onOpenSettings, onBack } = await renderScreen({ stage: 'denied' });

    expect(screen.getByRole('header', { name: location })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir configurações' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('Validando (T09)', () => {
  it('mostra que está verificando a localização, sem botão de cancelar', async () => {
    await renderScreen({ stage: 'locating', located: false });

    expect(screen.getByRole('header', { name: 'Verificando sua localização…' })).toBeOnTheScreen();
    expect(screen.queryByText('Localização confirmada')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('depois, mostra que está validando, com a localização confirmada', async () => {
    await renderScreen({ stage: 'validating', located: true });

    expect(screen.getByRole('header', { name: 'Validando seu acesso…' })).toBeOnTheScreen();
    expect(screen.getByText('Localização confirmada')).toBeOnTheScreen();
    expect(screen.getByText('Conferindo sua autorização')).toBeOnTheScreen();
    expect(screen.getByText('Mantenha o celular perto da catraca.')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sem posição, não afirma que a localização foi confirmada', async () => {
    await renderScreen({ stage: 'validating', located: false });

    expect(screen.queryByText('Localização confirmada')).toBeNull();
    expect(screen.getByText('Conferindo sua autorização')).toBeOnTheScreen();
  });
});

describe('Acesso autorizado (T10)', () => {
  it('mostra o título, o texto, o local, as entradas e a hora de São Paulo', async () => {
    await renderScreen({ result: granted });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Acesso autorizado')).toBeOnTheScreen();
    expect(within(alert).getByText('Pode passar pela catraca.')).toBeOnTheScreen();
    expect(screen.getByText('Catraca Social')).toBeOnTheScreen();
    expect(screen.getByText('Restam 2 entradas')).toBeOnTheScreen();
    expect(screen.getByText('Hoje')).toBeOnTheScreen();
    expect(screen.getByText('11:32')).toBeOnTheScreen();
  });

  it.each([
    [1, 'Resta 1 entrada'],
    [0, 'Nenhuma entrada restante'],
  ])('com %i, escreve "%s"', async (usosRestantes, text) => {
    await renderScreen({ result: { ...granted, usosRestantes } });

    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it('o fundo é o verde do resultado', async () => {
    await renderScreen({ result: granted });

    expect(screen.getByTestId('result-screen')).toHaveStyle({
      backgroundColor: colors.resultadoAutorizado,
    });
  });

  it('o ícone acompanha a cor', async () => {
    await renderScreen({ result: granted });

    expect(resultIcon()).toHaveTextContent(glyphOf('check'));
  });

  it('"Concluir" volta ao início', async () => {
    const { onDone } = await renderScreen({ result: granted });

    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('não mostra os botões de quem foi negado', async () => {
    await renderScreen({ result: granted });

    expect(screen.queryByText('Acesso negado')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Voltar ao início' })).toBeNull();
  });
});

const denied = (motivo: DenialReason): AccessResult => ({ tipo: 'NEGADO', motivo });

const primaryButton: Record<DenialReason, string> = {
  CREDENCIAL_INVALIDA: 'Ler outro QR Code',
  CREDENCIAL_EXPIRADA: 'Ler outro QR Code',
  CREDENCIAL_REUTILIZADA: 'Ler outro QR Code',
  DISTANTE_DO_TERMINAL: 'Tentar de novo',
  LOCALIZACAO_INVALIDA: 'Tentar de novo',
  SEM_AUTORIZACAO: 'Ver minhas autorizações',
  AUTORIZACAO_CANCELADA: 'Ver minhas autorizações',
  FORA_DO_PERIODO: 'Ver minhas autorizações',
  USOS_ESGOTADOS: 'Ver minhas autorizações',
  USUARIO_INATIVO: 'Ver minhas autorizações',
};

const reasons = Object.keys(denialReasons) as DenialReason[];

describe('Acesso negado (T11)', () => {
  it.each(reasons)('%s mostra o título, o texto do contrato, o ícone e os botões', async (code) => {
    const { message, icon } = denialReasons[code];

    await renderScreen({ result: denied(code) });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Acesso negado')).toBeOnTheScreen();
    expect(within(alert).getByText(message)).toBeOnTheScreen();
    expect(resultIcon()).toHaveTextContent(glyphOf(icon));
    expect(screen.getByRole('button', { name: primaryButton[code] })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeOnTheScreen();
  });

  it.each(reasons)('%s não mostra o código técnico em lugar nenhum', async (code) => {
    await renderScreen({ result: denied(code) });

    expect(JSON.stringify(screen.toJSON())).not.toContain(code);
  });

  it.each(reasons)('%s usa a cor do tom da tabela', async (code) => {
    await renderScreen({ result: denied(code) });

    const backgroundColor =
      denialReasons[code].tone === 'tente' ? colors.resultadoTente : colors.resultadoNegado;
    expect(screen.getByTestId('result-screen')).toHaveStyle({ backgroundColor });
  });

  it.each([
    ['CREDENCIAL_EXPIRADA', 'Ler outro QR Code'],
    ['DISTANTE_DO_TERMINAL', 'Tentar de novo'],
  ] as const)('%s: "%s" volta ao leitor', async (code, button) => {
    const { onReadAgain } = await renderScreen({ result: denied(code) });

    await fireEvent.press(screen.getByRole('button', { name: button }));

    expect(onReadAgain).toHaveBeenCalledTimes(1);
  });

  it('"Ver minhas autorizações" abre a lista', async () => {
    const { onSeeAuthorizations } = await renderScreen({ result: denied('USOS_ESGOTADOS') });

    await fireEvent.press(screen.getByRole('button', { name: 'Ver minhas autorizações' }));

    expect(onSeeAuthorizations).toHaveBeenCalledTimes(1);
  });

  it('"Voltar ao início" volta ao início', async () => {
    const { onDone } = await renderScreen({ result: denied('USOS_ESGOTADOS') });

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('Erros que não são negação', () => {
  it('sem conexão, pede para ler de novo, sem dizer que foi negado', async () => {
    const { onReadAgain } = await renderScreen({ result: { tipo: 'SEM_CONEXAO' } });

    expect(
      within(screen.getByRole('alert')).getByText(
        'Sem conexão. Verifique sua internet e leia o QR Code de novo.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Acesso negado')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ler outro QR Code' }));
    expect(onReadAgain).toHaveBeenCalledTimes(1);
  });

  it('erro do servidor pede para tentar em instantes, sem dizer que foi negado', async () => {
    await renderScreen({ result: { tipo: 'ERRO_SERVIDOR' } });

    expect(
      within(screen.getByRole('alert')).getByText(
        'Não foi possível validar agora. Tente de novo em instantes.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Acesso negado')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ler outro QR Code' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeOnTheScreen();
  });
});

describe('Barra de status', () => {
  beforeEach(() => jest.mocked(StatusBar).mockClear());

  it.each([
    ['âmbar', { tipo: 'NEGADO', motivo: 'CREDENCIAL_EXPIRADA' } as AccessResult, 'dark'],
    ['vermelho', { tipo: 'NEGADO', motivo: 'USOS_ESGOTADOS' } as AccessResult, 'light'],
    ['verde', granted, 'light'],
  ])('no fundo %s, os ícones do sistema continuam legíveis', async (_, result, style) => {
    await renderScreen({ result });

    expect(jest.mocked(StatusBar).mock.calls.at(-1)?.[0]).toEqual({ style });
  });
});

describe('Resultado para quem usa leitor de tela e para quem pede menos movimento', () => {
  afterEach(() => jest.restoreAllMocks());

  it('anuncia o resultado como alerta, com título e texto', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

    await renderScreen({ result: denied('USOS_ESGOTADOS') });

    expect(screen.getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'assertive');
    expect(announce).toHaveBeenCalledWith(
      'Acesso negado. Você já usou todas as entradas desta autorização.',
    );
  });

  it('o selo entra animado', async () => {
    const timing = jest.spyOn(Animated, 'timing');

    await renderScreen({ result: granted });

    expect(timing).toHaveBeenCalledTimes(1);
  });

  it('com animação reduzida, abre pronto', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timing = jest.spyOn(Animated, 'timing');
    timing.mockImplementation(
      () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }) as never,
    );

    await renderScreen({ result: granted });

    await waitFor(() => expect(screen.getByTestId('result-text')).toHaveStyle({ opacity: 1 }));
  });
});
