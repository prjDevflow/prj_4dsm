import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { useTheme, type ColorName, type TextVariant } from '@/theme';

export type TextProps = NativeTextProps & {
  /** Figma text style. Defaults to the body of the current scale. */
  variant?: TextVariant;
  color?: ColorName;
};

// Follows the system font size (allowFontScaling stays on): layouts must grow with the text.
export const Text = ({ variant, color = 'texto', style, ...props }: TextProps) => {
  const theme = useTheme();
  const textVariant = variant ?? (theme.scale === 'admin' ? 'adminCorpo' : 'pessoaCorpo');

  return (
    <NativeText
      {...props}
      style={[theme.typography[textVariant], { color: theme.colors[color] }, style]}
    />
  );
};
