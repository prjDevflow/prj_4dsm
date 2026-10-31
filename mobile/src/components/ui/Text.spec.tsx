import { render, screen } from '@testing-library/react-native';
import { colors, typography } from '@/theme';
import { Text } from './Text';

describe('Text', () => {
  it('usa o corpo da pessoa e a cor do texto por padrão', async () => {
    await render(<Text>Entre com sua conta</Text>);

    expect(screen.getByText('Entre com sua conta')).toHaveStyle({
      ...typography.pessoaCorpo,
      color: colors.texto,
    });
  });

  it('aplica a variante e a cor pedidas', async () => {
    await render(
      <Text variant="adminApoio" color="textoApoio">
        Catraca Social, Edifício Central
      </Text>,
    );

    expect(screen.getByText('Catraca Social, Edifício Central')).toHaveStyle({
      ...typography.adminApoio,
      color: colors.textoApoio,
    });
  });

  it('acompanha o tamanho de fonte do sistema', async () => {
    await render(<Text variant="pessoaTitulo">Minhas autorizações</Text>);

    expect(screen.getByText('Minhas autorizações').props.allowFontScaling).not.toBe(false);
  });
});
