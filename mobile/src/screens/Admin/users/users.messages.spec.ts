import { ApiError } from '@/service/ApiError';
import { loadErrorMessage, saveError } from './users.messages';

const conflict = (code: string) => new ApiError(409, code, 'mensagem técnica do servidor');

describe('mensagens dos usuários', () => {
  describe('saveError', () => {
    it('409 EMAIL_JA_CADASTRADO vai para o campo E-mail, não para a faixa', () => {
      expect(saveError(conflict('EMAIL_JA_CADASTRADO'), {})).toEqual({
        fields: { email: 'Este e-mail já está cadastrado.' },
        banner: null,
      });
    });

    it('409 AUTO_DESATIVACAO explica o que foi tentado', () => {
      const error = conflict('AUTO_DESATIVACAO');

      expect(saveError(error, { ativo: false }).banner).toBe('Você não pode desativar a si mesmo.');
      expect(saveError(error, { perfil: 'CONDOMINO' }).banner).toBe(
        'Você não pode alterar o seu próprio perfil.',
      );
      expect(saveError(error, { ativo: false, perfil: 'CONDOMINO' }).banner).toBe(
        'Você não pode desativar a si mesmo nem alterar o seu próprio perfil.',
      );
    });

    it('409 ULTIMO_ADMIN pede um administrador ativo', () => {
      expect(saveError(conflict('ULTIMO_ADMIN'), { ativo: false }).banner).toBe(
        'O sistema precisa de pelo menos um administrador ativo.',
      );
    });

    it('422 leva a mensagem de cada detalhe para o campo certo', () => {
      const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
        { field: 'nome', message: 'deve ter no mínimo 3 caracteres' },
        { field: 'senha', message: 'deve ter no máximo 72 bytes' },
      ]);

      expect(saveError(error, {})).toEqual({
        fields: { nome: 'Deve ter no mínimo 3 caracteres.', senha: 'Deve ter no máximo 72 bytes.' },
        banner: null,
      });
    });

    it('422 com campo que a tela não tem vira a faixa', () => {
      const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
        { field: 'corpo', message: 'informe ao menos um campo para alterar' },
      ]);

      expect(saveError(error, {})).toEqual({
        fields: {},
        banner: 'Confira os dados e tente de novo.',
      });
    });

    it('sem rede, tempo esgotado, 403, 404 e o resto viram textos sem código técnico', () => {
      const banner = (error: ApiError) => saveError(error, {}).banner;

      expect(banner(new ApiError(null, 'NETWORK', 'Sem conexão'))).toBe(
        'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
      );
      expect(banner(new ApiError(null, 'TIMEOUT', 'Tempo esgotado'))).toBe(
        'O servidor demorou para responder. Tente de novo.',
      );
      expect(banner(new ApiError(403, 'FORBIDDEN', 'Sem permissão'))).toBe(
        'Você não tem permissão para gerenciar usuários.',
      );
      expect(banner(new ApiError(404, 'NOT_FOUND', 'Usuário não encontrado'))).toBe(
        'Este usuário não existe mais. Volte para a lista.',
      );
      expect(banner(new ApiError(500, 'INTERNAL_ERROR', ''))).toBe(
        'Não foi possível salvar agora. Tente novamente em instantes.',
      );
    });
  });

  describe('loadErrorMessage', () => {
    it('separa sem rede e tempo esgotado do erro geral', () => {
      expect(loadErrorMessage(new ApiError(null, 'NETWORK', ''))).toBe(
        'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
      );
      expect(loadErrorMessage(new ApiError(null, 'TIMEOUT', ''))).toBe(
        'O servidor demorou para responder. Tente de novo.',
      );
      expect(loadErrorMessage(new ApiError(500, 'INTERNAL_ERROR', ''))).toBe(
        'Tente novamente em instantes.',
      );
    });
  });
});
