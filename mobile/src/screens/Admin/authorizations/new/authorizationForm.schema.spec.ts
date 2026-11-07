import { authorizationFormSchema, type AuthorizationFormValues } from './authorizationForm.schema';

const today = '2026-10-20';

const valid: AuthorizationFormValues = {
  usuarioId: 'u-1',
  accessPointId: 'ap-1',
  dataInicio: '2026-10-20',
  dataFim: '2026-10-25',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
};

const fieldErrors = (input: Partial<AuthorizationFormValues>) => {
  const result = authorizationFormSchema(today).safeParse({ ...valid, ...input });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('authorizationFormSchema', () => {
  it('entrega o corpo com os nomes do contrato', () => {
    expect(authorizationFormSchema(today).parse(valid)).toEqual(valid);
  });

  it('cada campo obrigatório tem a sua mensagem', () => {
    expect(
      fieldErrors({
        usuarioId: null,
        accessPointId: null,
        dataInicio: null,
        dataFim: null,
        horaInicio: null,
        horaFim: null,
      }),
    ).toEqual({
      usuarioId: 'Escolha a pessoa.',
      accessPointId: 'Escolha o local.',
      dataInicio: 'Informe a data inicial.',
      dataFim: 'Informe a data final.',
      horaInicio: 'Informe o horário inicial.',
      horaFim: 'Informe o horário final.',
    });
  });

  it('data final igual à inicial passa; antes da inicial é recusada', () => {
    expect(fieldErrors({ dataInicio: '2026-10-22', dataFim: '2026-10-22' })).toEqual({});
    expect(fieldErrors({ dataInicio: '2026-10-22', dataFim: '2026-10-21' })).toEqual({
      dataFim: 'A data final não pode ser antes da inicial.',
    });
  });

  it('data final no passado é recusada (hoje vale), como no servidor', () => {
    expect(fieldErrors({ dataInicio: '2026-10-01', dataFim: '2026-10-20' })).toEqual({});
    expect(fieldErrors({ dataInicio: '2026-10-01', dataFim: '2026-10-19' })).toEqual({
      dataFim: 'A data final não pode estar no passado.',
    });
  });

  it('horário final igual ou antes do inicial é recusado', () => {
    const message = 'O horário final precisa ser depois do inicial.';
    expect(fieldErrors({ horaInicio: '08:00', horaFim: '08:00' })).toEqual({ horaFim: message });
    expect(fieldErrors({ horaInicio: '18:00', horaFim: '08:00' })).toEqual({ horaFim: message });
    expect(fieldErrors({ horaInicio: '08:00', horaFim: '08:01' })).toEqual({});
  });

  it('utilizações de 1 a 1000: 0 e 1001 são recusados', () => {
    const message = 'Informe de 1 a 1000 entradas.';
    expect(fieldErrors({ usosPermitidos: 0 })).toEqual({ usosPermitidos: message });
    expect(fieldErrors({ usosPermitidos: 1001 })).toEqual({ usosPermitidos: message });
    expect(fieldErrors({ usosPermitidos: 2.5 })).toEqual({ usosPermitidos: message });
    expect(fieldErrors({ usosPermitidos: 1 })).toEqual({});
    expect(fieldErrors({ usosPermitidos: 1000 })).toEqual({});
  });

  it('os erros das datas e dos horários aparecem junto com os outros', () => {
    expect(fieldErrors({ usuarioId: null, dataFim: '2026-10-19', horaFim: '07:00' })).toEqual({
      usuarioId: 'Escolha a pessoa.',
      dataFim: 'A data final não pode ser antes da inicial.',
      horaFim: 'O horário final precisa ser depois do inicial.',
    });
  });
});
