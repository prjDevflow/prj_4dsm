import { describe, expect, it } from 'vitest';
import { DENIAL_REASONS, NFC_DENIAL_REASONS, QR_DENIAL_REASONS } from '../entities/DenialReason';
import { QR_DENIAL_MESSAGES, QR_GRANTED_MESSAGE } from '../useCases/Access/qrDenialMessages';
import { PERIOD_ORDER_ISSUE } from '../useCases/Events/accessEventQuery';
import {
  MAX_OFFLINE_EVENTS,
  OFFLINE_BATCH_SIZE_MESSAGES,
} from '../useCases/Events/IngestOfflineEvents/IngestOfflineEvents_DTO';
import { OFFLINE_EVENT_MESSAGES } from '../useCases/Events/IngestOfflineEvents/IngestOfflineEvents_UseCase';
import { UID_MESSAGE } from '../useCases/Nfc/uidField';
import { loadOpenApiSpec } from './openapi';

// The shape of the part of the document these tests read.
interface Spec {
  paths: Record<
    string,
    {
      post?: {
        responses: Record<
          string,
          {
            content?: {
              'application/json': { examples?: Record<string, unknown>; example?: unknown };
            };
          }
        >;
      };
    }
  >;
}

const operation = () => (loadOpenApiSpec() as unknown as Spec).paths['/access/qr/validate']?.post;

describe('openapi.yaml: POST /access/qr/validate', () => {
  it('deve trazer um exemplo de 403 para cada um dos dez motivos, com o texto do contrato', () => {
    const examples = operation()?.responses['403']?.content?.['application/json'].examples ?? {};

    expect(Object.keys(examples).sort()).toEqual([...QR_DENIAL_REASONS].sort());
    for (const reason of QR_DENIAL_REASONS) {
      expect(examples[reason], reason).toMatchObject({
        value: { error: { code: reason, message: QR_DENIAL_MESSAGES[reason] } },
      });
    }
  });

  it('deve trazer o exemplo de sucesso com a mensagem do contrato', () => {
    const success = operation()?.responses['200']?.content?.['application/json'].example;

    expect(success).toMatchObject({ resultado: 'AUTORIZADO', mensagem: QR_GRANTED_MESSAGE });
  });

  it.each(['401', '422', '429', '500'])('deve documentar a resposta %s', (status) => {
    expect(operation()?.responses[status]).toBeDefined();
  });
});

interface ErrorExample {
  value: {
    error: { code: string; message: string; details?: { field: string; message: string }[] };
  };
}

describe('openapi.yaml: tags NFC', () => {
  const responses = () =>
    (
      loadOpenApiSpec() as unknown as {
        components: {
          responses: Record<
            string,
            { content: { 'application/json': { examples?: Record<string, ErrorExample> } } }
          >;
        };
      }
    ).components.responses;

  it('deve trazer no exemplo de UID inválido a mesma mensagem que a API devolve', () => {
    const example =
      responses().NfcTagValidationError?.content['application/json'].examples?.uidInvalido;

    expect(example?.value.error.details).toEqual([{ field: 'uid', message: UID_MESSAGE }]);
  });

  it('deve documentar as quatro rotas e o 409 TAG_JA_CADASTRADA', () => {
    const paths = (
      loadOpenApiSpec() as unknown as { paths: Record<string, Record<string, unknown>> }
    ).paths;

    expect(Object.keys(paths['/nfc-tags'] ?? {}).sort()).toEqual(['get', 'post']);
    expect(Object.keys(paths['/nfc-tags/{id}'] ?? {})).toContain('patch');
    expect(Object.keys(paths['/terminals/{id}/enroll-mode'] ?? {})).toContain('post');
    expect(responses().NfcTagConflict).toBeDefined();
  });
});

describe('openapi.yaml: POST /terminal/nfc', () => {
  interface NfcOperation {
    parameters?: { name: string; in: string; required?: boolean; schema?: { format?: string } }[];
    security?: Record<string, unknown>[];
    responses: Record<
      string,
      {
        $ref?: string;
        content?: {
          'application/json': { examples?: Record<string, { value: unknown }>; example?: unknown };
        };
      }
    >;
  }

  const nfc = () =>
    (loadOpenApiSpec() as unknown as { paths: Record<string, { post?: NfcOperation }> }).paths[
      '/terminal/nfc'
    ]?.post;

  it('deve trazer um exemplo de 200 para a autorização, o cadastro e cada um dos sete motivos de negação', () => {
    const examples = nfc()?.responses['200']?.content?.['application/json'].examples ?? {};

    expect(Object.keys(examples).sort()).toEqual(
      ['AUTORIZADO', 'CADASTRADA', ...NFC_DENIAL_REASONS].sort(),
    );
    expect(examples.AUTORIZADO?.value).toEqual({ resultado: 'AUTORIZADO', aberturaMs: 5000 });
    expect(examples.CADASTRADA?.value).toEqual({ resultado: 'CADASTRADA' });
    for (const reason of NFC_DENIAL_REASONS) {
      expect(examples[reason]?.value, reason).toEqual({ resultado: 'NEGADO', motivo: reason });
    }
  });

  it('deve exigir o cabeçalho Idempotency-Key no formato de UUID', () => {
    const header = nfc()?.parameters?.find((p) => p.name === 'Idempotency-Key');

    expect(header).toMatchObject({ in: 'header', required: true, schema: { format: 'uuid' } });
  });

  it('deve ser autenticada pela chave do terminal, nunca pelo token de usuário', () => {
    expect(nfc()?.security).toEqual([{ terminalId: [], terminalKey: [] }]);
  });

  it.each(['401', '403', '409', '422', '500'])('deve documentar a resposta %s', (status) => {
    expect(nfc()?.responses[status]).toBeDefined();
  });

  it('deve documentar os dois 409: a chave já usada e a tag já cadastrada pelo modo de cadastro', () => {
    const conflict = loadOpenApiSpec() as unknown as {
      components: {
        responses: Record<
          string,
          { content: { 'application/json': { examples: Record<string, unknown> } } }
        >;
      };
    };
    const ref = nfc()?.responses['409']?.$ref ?? '';
    const name = ref.split('/').pop() ?? '';
    const examples = conflict.components.responses[name]?.content['application/json'].examples;

    expect(Object.keys(examples ?? {}).sort()).toEqual(['chaveRepetida', 'tagJaCadastrada']);
  });

  it('deve trazer o 422 de Idempotency-Key ausente ou fora do formato', () => {
    const spec = loadOpenApiSpec() as unknown as {
      components: {
        responses: Record<
          string,
          { content: { 'application/json': { examples: Record<string, ErrorExample> } } }
        >;
      };
    };
    const name = (nfc()?.responses['422']?.$ref ?? '').split('/').pop() ?? '';
    const examples = spec.components.responses[name]?.content['application/json'].examples ?? {};

    expect(examples.chaveInvalida?.value.error.details).toEqual([
      { field: 'Idempotency-Key', message: 'deve ser um UUID' },
    ]);
    expect(examples.uidInvalido?.value.error.details).toEqual([
      { field: 'uid', message: UID_MESSAGE },
    ]);
  });
});

describe('openapi.yaml: histórico de acessos', () => {
  interface Param {
    name?: string;
    $ref?: string;
    schema?: { enum?: string[]; format?: string };
    description?: string;
  }
  interface Response {
    $ref?: string;
    content?: {
      'application/json': {
        schema?: { $ref?: string };
        examples?: Record<string, { value: { data?: Record<string, unknown>[] } }>;
      };
    };
  }
  interface HistoryOperation {
    operationId?: string;
    tags?: string[];
    parameters?: Param[];
    responses: Record<string, Response>;
  }
  interface HistorySpec {
    paths: Record<string, Record<string, HistoryOperation>>;
    components: {
      schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }>;
      responses: Record<
        string,
        {
          content: {
            'application/json': {
              examples: Record<string, { value: { error: { details: unknown[] } } }>;
            };
          };
        }
      >;
    };
  }

  const spec = () => loadOpenApiSpec() as unknown as HistorySpec;
  const history = () => spec().paths['/access-events']?.get;
  const mine = () => spec().paths['/me/access-events']?.get;
  const names = (operation?: HistoryOperation) =>
    (operation?.parameters ?? []).map((p) => p.name ?? p.$ref?.split('/').pop()).sort();
  const param = (operation: HistoryOperation | undefined, name: string) =>
    operation?.parameters?.find((p) => p.name === name);

  const EVENT_FIELDS = [
    'authorizationId',
    'distanciaM',
    'id',
    'local',
    'metodo',
    'motivo',
    'ocorridoEm',
    'resultado',
    'terminal',
    'usuario',
  ];

  it('deve documentar as duas rotas só com leitura (GET), nunca escrita', () => {
    expect(Object.keys(spec().paths['/access-events'] ?? {})).toEqual(['get']);
    expect(Object.keys(spec().paths['/me/access-events'] ?? {})).toEqual(['get']);
    expect(history()?.operationId).toBe('listAccessEvents');
    expect(mine()?.operationId).toBe('listMyAccessEvents');
  });

  it('deve aceitar os oito filtros e a paginação na rota do administrador', () => {
    expect(names(history())).toEqual(
      [
        'Page',
        'PageSize',
        'accessPointId',
        'ate',
        'de',
        'metodo',
        'motivo',
        'resultado',
        'terminalId',
        'usuarioId',
      ].sort(),
    );
  });

  it('deve aceitar os mesmos filtros em /me, menos usuarioId: o dono é o do token', () => {
    expect(names(mine())).toEqual(
      [
        'Page',
        'PageSize',
        'accessPointId',
        'ate',
        'de',
        'metodo',
        'motivo',
        'resultado',
        'terminalId',
      ].sort(),
    );
  });

  it.each([
    ['administrador', history],
    ['/me', mine],
  ])('deve listar os mesmos códigos de motivo, método e resultado do código (%s)', (_who, op) => {
    expect([...(param(op(), 'motivo')?.schema?.enum ?? [])].sort()).toEqual(
      [...DENIAL_REASONS].sort(),
    );
    expect(param(op(), 'metodo')?.schema?.enum).toEqual(['QR', 'NFC']);
    expect(param(op(), 'resultado')?.schema?.enum).toEqual(['AUTORIZADO', 'NEGADO']);
  });

  it('deve descrever de e ate como instantes inclusivos, avisando que o + do fuso vira %2B', () => {
    for (const name of ['de', 'ate']) {
      expect(param(history(), name)?.schema?.format, name).toBe('date-time');
      expect(param(history(), name)?.description, name).toContain('inclusivo');
    }
    expect(param(history(), 'de')?.description).toContain('%2B');
  });

  it('deve descrever o evento só com os campos da resposta, sem detalhes nem chave de idempotência', () => {
    const event = spec().components.schemas.EventoDeAcesso;

    expect(Object.keys(event?.properties ?? {}).sort()).toEqual(EVENT_FIELDS);
    expect([...(event?.required ?? [])].sort()).toEqual(EVENT_FIELDS);
  });

  it('deve trazer exemplos com exatamente esses campos, inclusive sem pessoa e sem ponto', () => {
    const examples = history()?.responses['200']?.content?.['application/json'].examples ?? {};

    expect(Object.keys(examples).sort()).toEqual([
      'aprovadoPorQr',
      'credencialDesconhecida',
      'negadoPorNfc',
      'tagDesconhecida',
    ]);
    for (const [name, example] of Object.entries(examples)) {
      for (const item of example.value.data ?? []) {
        expect(Object.keys(item).sort(), name).toEqual(EVENT_FIELDS);
      }
    }
    expect(examples.tagDesconhecida?.value.data?.[0]).toMatchObject({ usuario: null });
    // The app is always logged in, so even a QR that does not exist has a person, but no terminal.
    const unknownQr = examples.credencialDesconhecida?.value.data?.[0];
    expect(unknownQr).toMatchObject({ local: null, terminal: null });
    expect(unknownQr?.usuario).not.toBeNull();
  });

  it('deve documentar 401 e 422 nas duas rotas e o 403 só na do administrador', () => {
    expect(Object.keys(history()?.responses ?? {}).sort()).toEqual([
      '200',
      '401',
      '403',
      '422',
      '500',
    ]);
    expect(Object.keys(mine()?.responses ?? {}).sort()).toEqual(['200', '401', '422', '500']);
  });

  it('deve trazer no exemplo de período invertido a mesma mensagem que a API devolve', () => {
    const name = (history()?.responses['422']?.$ref ?? '').split('/').pop() ?? '';
    const examples = spec().components.responses[name]?.content['application/json'].examples ?? {};

    expect(examples.periodoInvertido?.value.error.details).toEqual([
      { field: 'ate', message: PERIOD_ORDER_ISSUE.error },
    ]);
  });
});

describe('openapi.yaml: POST /terminal/events/batch', () => {
  interface Schema {
    type?: string;
    enum?: string[];
    required?: string[];
    minItems?: number;
    maxItems?: number;
    items?: { $ref?: string };
    properties?: Record<string, Schema>;
    description?: string;
  }
  interface BatchSpec {
    paths: Record<
      string,
      {
        post?: {
          operationId?: string;
          security?: Record<string, unknown>[];
          requestBody?: { content: { 'application/json': { schema: { $ref?: string } } } };
          responses: Record<
            string,
            {
              $ref?: string;
              content?: {
                'application/json': {
                  example?: unknown;
                  examples?: Record<string, { value: unknown }>;
                };
              };
            }
          >;
        };
      }
    >;
    components: {
      schemas: Record<string, Schema>;
      responses: Record<
        string,
        {
          description?: string;
          content: {
            'application/json': {
              example?: { error: { code: string } };
              examples?: Record<string, { value: { error: { details: unknown[] } } }>;
            };
          };
        }
      >;
    };
  }

  const spec = () => loadOpenApiSpec() as unknown as BatchSpec;
  const batch = () => spec().paths['/terminal/events/batch']?.post;
  const refName = (ref?: string) => (ref ?? '').split('/').pop() ?? '';
  const schema = (name: string) => spec().components.schemas[name];
  const eventSchema = () => {
    const request = schema(refName(batch()?.requestBody?.content['application/json'].schema.$ref));
    return schema(refName(request?.properties?.events?.items?.$ref));
  };

  it('deve ser autenticada pela chave do terminal, nunca pelo token de usuário', () => {
    expect(batch()?.security).toEqual([{ terminalId: [], terminalKey: [] }]);
  });

  it.each(['200', '401', '403', '413', '422', '500'])('deve documentar a resposta %s', (status) => {
    expect(batch()?.responses[status]).toBeDefined();
  });

  it('deve limitar o lote a de 1 a 50 eventos', () => {
    const request = schema(refName(batch()?.requestBody?.content['application/json'].schema.$ref));

    expect(request?.required).toEqual(['events']);
    expect(request?.properties?.events).toMatchObject({
      type: 'array',
      minItems: 1,
      maxItems: MAX_OFFLINE_EVENTS,
    });
  });

  it('deve exigir os seis campos de cada evento', () => {
    expect([...(eventSchema()?.required ?? [])].sort()).toEqual(
      ['clientEventId', 'metodo', 'motivo', 'ocorridoEm', 'resultado', 'uid'].sort(),
    );
  });

  it('deve aceitar de cada evento só o que um terminal sem conexão pode enviar: NFC, NEGADO e TERMINAL_OFFLINE', () => {
    const fields = eventSchema()?.properties ?? {};

    expect(fields.metodo?.enum).toEqual(['NFC']);
    expect(fields.resultado?.enum).toEqual(['NEGADO']);
    expect(fields.motivo?.enum).toEqual(['TERMINAL_OFFLINE']);
  });

  it('deve trazer o exemplo de 200 com os dois contadores', () => {
    const example = batch()?.responses['200']?.content?.['application/json'].example;

    expect(example).toEqual({ aceitos: 3, duplicados: 1 });
  });

  it('deve trazer nos exemplos de 422 as mesmas mensagens que a API devolve', () => {
    const name = refName(batch()?.responses['422']?.$ref);
    const examples = spec().components.responses[name]?.content['application/json'].examples ?? {};
    const details = (example: string) => examples[example]?.value.error.details;

    expect(details('aprovacaoNoLote')).toEqual([
      { field: 'events.1.resultado', message: OFFLINE_EVENT_MESSAGES.resultado },
    ]);
    expect(details('instanteForaDaJanela')).toEqual([
      { field: 'events.0.ocorridoEm', message: OFFLINE_EVENT_MESSAGES.ocorridoEm },
    ]);
    expect(details('loteGrande')).toEqual([
      { field: 'events', message: OFFLINE_BATCH_SIZE_MESSAGES.max },
    ]);
    expect(details('uidInvalido')).toEqual([
      { field: 'events.2.uid', message: OFFLINE_EVENT_MESSAGES.uid },
    ]);
  });

  it('deve documentar o 413 PAYLOAD_TOO_LARGE e dizer o limite de 64 kb', () => {
    const name = refName(batch()?.responses['413']?.$ref);
    const response = spec().components.responses[name];

    expect(response?.content['application/json'].example?.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(response?.description).toContain('64 kb');
  });

  it('deve descrever o ocorridoEm do evento como o instante do relógio do terminal nos lotes offline', () => {
    const description = schema('EventoDeAcesso')?.properties?.ocorridoEm?.description ?? '';

    expect(description).toContain('relógio do terminal');
  });
});

describe('openapi.yaml: informações gerais', () => {
  const info = () => (loadOpenApiSpec() as unknown as { info: { description: string } }).info;

  it('deve avisar que um corpo acima de 100 kb dá 413 PAYLOAD_TOO_LARGE em qualquer rota', () => {
    expect(info().description).toContain('PAYLOAD_TOO_LARGE');
    expect(info().description).toContain('100 kb');
  });
});
