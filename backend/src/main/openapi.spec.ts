import { describe, expect, it } from 'vitest';
import { QR_DENIAL_REASONS } from '../entities/DenialReason';
import { QR_DENIAL_MESSAGES, QR_GRANTED_MESSAGE } from '../useCases/Access/qrDenialMessages';
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
