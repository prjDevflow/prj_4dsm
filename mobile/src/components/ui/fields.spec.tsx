import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { createRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { colors } from '@/theme';
import { DateField, TimeField } from './DateField';
import { NumberStepper } from './NumberStepper';
import { PasswordField } from './PasswordField';
import { SelectField } from './SelectField';
import { SwitchField } from './SwitchField';
import { TextField } from './TextField';

// The native picker does not exist under Jest: a button stands in for it and picks 25/10/2026 14:05.
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  const Picker = ({
    mode,
    onChange,
  }: {
    mode: 'date' | 'time';
    onChange: (event: { type: string }, date: Date) => void;
  }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => onChange({ type: 'set' }, new Date(2026, 9, 25, 14, 5))}
    >
      <Text>{mode === 'time' ? 'Escolher 14:05' : 'Escolher 25/10/2026'}</Text>
    </Pressable>
  );
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

describe('TextField', () => {
  it('mostra o rótulo acima, a ajuda, e o campo leva o nome do rótulo', async () => {
    await render(
      <TextField
        label="E-mail"
        help="Use o e-mail do cadastro."
        value=""
        onChangeText={jest.fn()}
      />,
    );

    expect(screen.getByText('E-mail')).toBeOnTheScreen();
    expect(screen.getByText('Use o e-mail do cadastro.')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail').props.accessibilityHint).toBe(
      'Use o e-mail do cadastro.',
    );
  });

  it('mostra o erro com ícone e texto no lugar da ajuda, e o erro é anunciado', async () => {
    await render(
      <TextField
        label="E-mail"
        help="Use o e-mail do cadastro."
        error="Informe seu e-mail."
        value=""
        onChangeText={jest.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Informe seu e-mail.')).toBeOnTheScreen();
    expect(within(alert).getByTestId('field-error-icon')).toBeOnTheScreen();
    expect(screen.queryByText('Use o e-mail do cadastro.')).toBeNull();
    expect(screen.getByLabelText('E-mail').props.accessibilityHint).toBe('Informe seu e-mail.');
    expect(screen.getByTestId('field-box')).toHaveStyle({ borderColor: colors.erro });
  });

  it('repassa o texto digitado', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Nome completo" value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Maria Souza');

    expect(onChangeText).toHaveBeenCalledWith('Maria Souza');
  });

  it('somente leitura não deixa editar', async () => {
    await render(<TextField label="E-mail" value="maria.souza@email.com" readOnly />);

    expect(screen.getByLabelText('E-mail').props.editable).toBe(false);
  });

  it('aceita ref, para o setFocus do react-hook-form', async () => {
    const ref = createRef<TextInput>();
    await render(<TextField ref={ref} label="E-mail" value="" onChangeText={jest.fn()} />);

    expect(typeof ref.current?.focus).toBe('function');
  });
});

describe('PasswordField', () => {
  const ControlledPassword = () => {
    const [value, setValue] = useState('');
    return <PasswordField label="Senha" value={value} onChangeText={setValue} />;
  };

  it('"Mostrar" revela, "Ocultar" esconde, sem perder o texto, e o rótulo muda junto', async () => {
    await render(<ControlledPassword />);
    const input = () => screen.getByLabelText('Senha');

    await fireEvent.changeText(input(), 'segredo123');
    expect(input().props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input().props.secureTextEntry).toBe(false);
    expect(input().props.value).toBe('segredo123');
    expect(screen.getByText('Ocultar')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input().props.secureTextEntry).toBe(true);
    expect(input().props.value).toBe('segredo123');
  });

  it('o botão de mostrar tem toque de 48 × 48', async () => {
    await render(<ControlledPassword />);

    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveStyle({
      minWidth: 48,
      minHeight: 48,
    });
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'CONDOMINO', label: 'Condômino' },
    { value: 'VISITANTE', label: 'Visitante' },
  ];

  it('mostra o rótulo e a opção escolhida', async () => {
    await render(
      <SelectField label="Perfil" options={options} value="CONDOMINO" onChange={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Perfil' })).toBeOnTheScreen();
    expect(screen.getByText('Condômino')).toBeOnTheScreen();
  });

  it('sem valor mostra "Selecione"', async () => {
    await render(
      <SelectField label="Perfil" options={options} value={null} onChange={jest.fn()} />,
    );

    expect(screen.getByText('Selecione')).toBeOnTheScreen();
  });

  it('abre a lista, escolhe a opção, avisa e fecha', async () => {
    const onChange = jest.fn();
    await render(<SelectField label="Perfil" options={options} value={null} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Perfil' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Visitante' }));

    expect(onChange).toHaveBeenCalledWith('VISITANTE');
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('com busca, filtra as opções sem ligar para acento e maiúscula', async () => {
    await render(
      <SelectField label="Perfil" options={options} value={null} onChange={jest.fn()} searchable />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Perfil' }));
    await fireEvent.changeText(screen.getByLabelText('Buscar'), 'CONDO');

    expect(screen.getByRole('radio', { name: 'Condômino' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Visitante' })).toBeNull();
  });
});

describe('DateField e TimeField', () => {
  it('DateField mostra dd/MM/aaaa e entrega YYYY-MM-DD', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Início" value="2026-10-20" onChange={onChange} />);

    expect(screen.getByText('20/10/2026')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Início' }));
    await fireEvent.press(screen.getByText('Escolher 25/10/2026'));

    expect(onChange).toHaveBeenCalledWith('2026-10-25');
  });

  it('TimeField mostra HH:mm e entrega HH:mm', async () => {
    const onChange = jest.fn();
    await render(<TimeField label="Das" value="08:00" onChange={onChange} />);

    expect(screen.getByText('08:00')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Das' }));
    await fireEvent.press(screen.getByText('Escolher 14:05'));

    expect(onChange).toHaveBeenCalledWith('14:05');
  });

  it('sem valor mostra o formato esperado', async () => {
    await render(<DateField label="Fim" value={null} onChange={jest.fn()} />);

    expect(screen.getByText('dd/mm/aaaa')).toBeOnTheScreen();
  });
});

describe('NumberStepper', () => {
  it('"+" aumenta e "−" diminui um', async () => {
    const onChange = jest.fn();
    await render(<NumberStepper label="Entradas" value={3} min={1} max={10} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar Entradas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Diminuir Entradas' }));

    expect(onChange.mock.calls).toEqual([[4], [2]]);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('"−" desabilita no mínimo e não passa dele', async () => {
    const onChange = jest.fn();
    await render(<NumberStepper label="Entradas" value={1} min={1} max={10} onChange={onChange} />);

    const minus = screen.getByRole('button', { name: 'Diminuir Entradas' });
    await fireEvent.press(minus);

    expect(minus).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('"+" desabilita no máximo e não passa dele', async () => {
    const onChange = jest.fn();
    await render(
      <NumberStepper label="Entradas" value={10} min={1} max={10} onChange={onChange} />,
    );

    const plus = screen.getByRole('button', { name: 'Aumentar Entradas' });
    await fireEvent.press(plus);

    expect(plus).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('o leitor de tela ajusta o valor pelos gestos de aumentar e diminuir', async () => {
    const onChange = jest.fn();
    await render(<NumberStepper label="Entradas" value={3} min={1} max={10} onChange={onChange} />);

    const value = screen.getByRole('adjustable', { name: 'Entradas' });
    await fireEvent(value, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(value).toHaveAccessibilityValue({ min: 1, max: 10, now: 3 });
    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe('SwitchField', () => {
  it('é um interruptor com rótulo e alterna ao tocar', async () => {
    const onValueChange = jest.fn();
    await render(
      <SwitchField label="Mostrar usuários inativos" value={false} onValueChange={onValueChange} />,
    );

    const toggle = screen.getByRole('switch', { name: 'Mostrar usuários inativos' });
    await fireEvent.press(toggle);

    expect(toggle).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('ligado aparece marcado e o toque no rótulo também desliga', async () => {
    const onValueChange = jest.fn();
    await render(
      <SwitchField label="Mostrar usuários inativos" value onValueChange={onValueChange} />,
    );

    expect(screen.getByRole('switch', { name: 'Mostrar usuários inativos' })).toBeChecked();

    await fireEvent.press(screen.getByText('Mostrar usuários inativos'));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
