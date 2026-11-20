import { describe, expect, it } from 'vitest';
import { UID_MESSAGE, uidField } from './uidField';

describe('uidField', () => {
  it.each(['04A1B2C3', '04:a1:b2:c3', '04-A1-B2-C3', '04 a1 b2 c3', '04A1B2C3D4E5F60718AB'])(
    'deve aceitar %s e devolver o texto como veio (quem normaliza é o use case)',
    (uid) => {
      expect(uidField.parse(uid)).toBe(uid);
    },
  );

  it.each(['04A1B2C', '04A1B2C3D4E5F60718AB1', '04A1B2CZ', ''])(
    'deve recusar "%s" com a mensagem do contrato',
    (uid) => {
      const result = uidField.safeParse(uid);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(UID_MESSAGE);
    },
  );

  it.each([undefined, null, 12345678])('deve recusar %s, que não é texto', (value) => {
    expect(uidField.safeParse(value).success).toBe(false);
  });
});
