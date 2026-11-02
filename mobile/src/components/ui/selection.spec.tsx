import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { colors } from '@/theme';
import { RadioGroup } from './RadioGroup';
import { SearchField } from './SearchField';

const perfis = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'CONDOMINO', label: 'Condômino' },
  { value: 'VISITANTE', label: 'Visitante' },
] as const;

const ControlledRadio = ({ onChange }: { onChange?: (value: string) => void }) => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <RadioGroup
      label="Perfil"
      options={[...perfis]}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
};

describe('RadioGroup', () => {
  it('é um grupo com o rótulo, e cada opção é um rádio de 48 de altura', async () => {
    await render(<ControlledRadio />);

    expect(screen.getByRole('radiogroup', { name: 'Perfil' })).toBeOnTheScreen();
    for (const { label } of perfis) {
      const radio = screen.getByRole('radio', { name: label });
      expect(radio).not.toBeChecked();
      expect(radio).toHaveStyle({ minHeight: 48 });
    }
  });

  it('tocar numa opção marca só ela e avisa o valor', async () => {
    const onChange = jest.fn();
    await render(<ControlledRadio onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Condômino' }));

    expect(onChange).toHaveBeenCalledWith('CONDOMINO');
    expect(screen.getByRole('radio', { name: 'Condômino' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Administrador' })).not.toBeChecked();
  });

  it('mostra o erro com ícone e texto embaixo das opções', async () => {
    await render(
      <RadioGroup
        label="Perfil"
        options={[...perfis]}
        value={null}
        onChange={jest.fn()}
        error="Escolha um perfil."
      />,
    );

    expect(screen.getByText('Escolha um perfil.')).toBeOnTheScreen();
    expect(
      screen.getByTestId('field-error-icon', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('desabilitado não muda o valor', async () => {
    const onChange = jest.fn();
    await render(
      <RadioGroup label="Perfil" options={[...perfis]} value={null} onChange={onChange} disabled />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Visitante' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Visitante' })).toBeDisabled();
  });
});

describe('SearchField', () => {
  const ControlledSearch = () => {
    const [value, setValue] = useState('');
    return <SearchField label="Buscar por nome ou e-mail" value={value} onChangeText={setValue} />;
  };

  it('é um campo com o rótulo como nome e como texto de exemplo, em pílula', async () => {
    await render(<ControlledSearch />);

    const input = screen.getByLabelText('Buscar por nome ou e-mail');
    expect(input).toHaveProp('placeholder', 'Buscar por nome ou e-mail');
    expect(screen.getByTestId('search-box')).toHaveStyle({
      borderRadius: 999,
      backgroundColor: colors.superficieAlta,
    });
  });

  it('com texto aparece "Limpar busca", que esvazia o campo', async () => {
    await render(<ControlledSearch />);
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Buscar por nome ou e-mail'), 'maria');
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar busca' }));

    expect(screen.getByLabelText('Buscar por nome ou e-mail')).toHaveProp('value', '');
  });
});
