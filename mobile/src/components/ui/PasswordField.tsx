import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { TextField, type TextFieldProps } from './TextField';

type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailing'>;

/** TextField with "Mostrar"/"Ocultar". Toggling never clears what was typed. */
export const PasswordField = (props: PasswordFieldProps) => {
  const { scale, sizes } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="current-password"
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onPress={() => setVisible((current) => !current)}
          style={({ pressed }) => [
            styles.toggle,
            { minWidth: sizes.touchMin, minHeight: sizes.touchMin },
            pressed && styles.pressed,
          ]}
        >
          <Text variant={scale === 'admin' ? 'adminBotao' : 'pessoaCorpoForte'} color="primaria">
            {visible ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
      }
    />
  );
};

const styles = StyleSheet.create({
  toggle: { alignItems: 'center', justifyContent: 'center', marginRight: -8, paddingHorizontal: 8 },
  pressed: { opacity: 0.7 },
});
