import { describe, expect, it } from 'vitest';
import { NFC_DENIAL_REASONS, QR_DENIAL_REASONS } from '../entities/DenialReason';
import { QR_DENIAL_MESSAGES, QR_GRANTED_MESSAGE } from '../useCases/Access/qrDenialMessages';
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
