import { describe, expect, it } from 'vitest';
import { QR_DENIAL_REASONS } from '../entities/DenialReason';
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
