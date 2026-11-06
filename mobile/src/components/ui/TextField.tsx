import { useState, type ReactNode, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '@/theme';
import { FieldLabel, FieldMessage, fieldBoxStyle, fieldStyles } from './Field';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  /** Always visible above the box; it is also the field name for the screen reader. */
  label: string;
  help?: string;
  error?: string;
  readOnly?: boolean;
  /** Content at the end of the box ("Mostrar" of the password, an icon...). */
  trailing?: ReactNode;
  /** For react-hook-form's setFocus. */
  ref?: Ref<TextInputInstance>;
};

export const TextField = ({
  label,
  help,
  error,
  readOnly = false,
  editable = true,
  trailing,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const text = theme.typography[theme.scale === 'admin' ? 'adminCorpo' : 'pessoaCorpo'];

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} />
      <View testID="field-box" style={fieldBoxStyle(theme, { focused, error: !!error, readOnly })}>
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? help}
          editable={editable && !readOnly}
          placeholderTextColor={theme.colors.contorno}
          selectionColor={theme.colors.primaria}
          cursorColor={theme.colors.primaria}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            { fontFamily: text.fontFamily, fontSize: text.fontSize, color: theme.colors.texto },
          ]}
        />
        {trailing}
      </View>
      <FieldMessage help={help} error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  input: { flex: 1, paddingVertical: 12 },
});
