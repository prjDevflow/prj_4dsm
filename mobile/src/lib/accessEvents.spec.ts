import {
  accessReasonLabel,
  accessReasonOptions,
  formatEventDateTime,
  formatEventTime,
  lastDays,
  metodoLabels,
  periodInstants,
} from './accessEvents';

const codes = [
  ['CREDENCIAL_INVALIDA', 'QR Code inválido'],
  ['CREDENCIAL_EXPIRADA', 'QR Code expirado'],
  ['CREDENCIAL_REUTILIZADA', 'QR Code já usado'],
  ['DISTANTE_DO_TERMINAL', 'Longe da catraca'],
  ['LOCALIZACAO_INVALIDA', 'Sem localização'],
  ['SEM_AUTORIZACAO', 'Sem autorização'],
  ['AUTORIZACAO_CANCELADA', 'Autorização cancelada'],
  ['FORA_DO_PERIODO', 'Fora do período'],
  ['USOS_ESGOTADOS', 'Entradas esgotadas'],
  ['USUARIO_INATIVO', 'Cadastro inativo'],
  ['TAG_DESCONHECIDA', 'Tag não reconhecida'],
  ['TAG_INATIVA', 'Tag desativada'],
  ['TERMINAL_OFFLINE', 'Terminal sem conexão'],
] as const;

describe('accessReasonLabel', () => {
  it.each(codes)('%s vira "%s"', (code, label) => {
    expect(accessReasonLabel(code)).toBe(label);
  });

  it.each([['MOTIVO_NOVO'], ['toString'], [null], ['']])(
    'um código que o app não conhece (%s) não aparece na tela',
    (code) => {
      expect(accessReasonLabel(code)).toBe('Motivo não informado');
    },
  );

  it('o filtro oferece os 13 motivos do contrato, em texto', () => {
    expect(accessReasonOptions).toEqual(codes.map(([value, label]) => ({ value, label })));
  });
});

describe('textos do método', () => {
  it('QR Code e Tag NFC', () => {
    expect(metodoLabels).toEqual({ QR: 'QR Code', NFC: 'Tag NFC' });
  });
});

describe('data e hora do evento, em São Paulo', () => {
  it('a lista mostra dd/MM HH:mm:ss', () => {
    expect(formatEventTime('2026-10-24T17:32:07.123Z')).toBe('24/10 14:32:07');
  });

  it('perto da meia-noite UTC, ainda é o dia anterior em São Paulo', () => {
    expect(formatEventTime('2026-10-25T02:05:09Z')).toBe('24/10 23:05:09');
  });

  it('meia-noite em São Paulo é 00, não 24', () => {
    expect(formatEventTime('2026-10-25T03:00:00Z')).toBe('25/10 00:00:00');
  });

  it('o detalhe mostra a data completa', () => {
    expect(formatEventDateTime('2026-10-24T17:32:07Z')).toBe('24/10/2026 às 14:32:07');
  });
});

describe('período', () => {
  it('os últimos 7 dias são hoje e os 6 anteriores, no dia de São Paulo', () => {
    // 01:30 UTC of 25/10 is still 24/10 in São Paulo.
    expect(lastDays(new Date('2026-10-25T01:30:00Z'), 7)).toEqual({
      dataDe: '2026-10-18',
      dataAte: '2026-10-24',
    });
  });

  it('atravessa o mês sem errar o dia', () => {
    expect(lastDays(new Date('2026-11-03T15:00:00Z'), 7)).toEqual({
      dataDe: '2026-10-28',
      dataAte: '2026-11-03',
    });
  });

  it('o período vira os instantes de início e fim do dia em São Paulo, com os limites incluídos', () => {
    expect(periodInstants('2026-10-18', '2026-10-24')).toEqual({
      de: '2026-10-18T00:00:00-03:00',
      ate: '2026-10-24T23:59:59.999-03:00',
    });
  });

  it('sem datas, não manda limite', () => {
    expect(periodInstants(null, null)).toEqual({ de: undefined, ate: undefined });
  });
});
