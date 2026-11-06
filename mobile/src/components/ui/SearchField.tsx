import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

type SearchFieldProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  /** Name for the screen reader and the text shown while empty ("Buscar por nome ou e-mail"). */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
};

/** Search pill at the top of a list (T15): magnifier on the left, "Limpar busca" when filled. */
export const SearchField = ({ label, value, onChangeText, ...inputProps }: SearchFieldProps) => {
  const theme = useTheme();
  const { colors, sizes } = theme;
  const text = theme.typography[theme.scale === 'admin' ? 'adminCorpo' : 'pessoaCorpo'];

  return (
    <View
      testID="search-box"
      style={[
        styles.box,
        {
          minHeight: sizes.field,
          borderRadius: theme.radius.pilula,
          backgroundColor: colors.superficieAlta,
        },
      ]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon name="search" color={colors.textoApoio} />
      </View>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholder={label}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textoApoio}
        selectionColor={colors.primaria}
        cursorColor={colors.primaria}
        autoCorrect={false}
        returnKeyType="search"
        style={[
          styles.input,
          { fontFamily: text.fontFamily, fontSize: text.fontSize, color: colors.texto },
        ]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          onPress={() => onChangeText('')}
          style={({ pressed }) => [
            styles.clear,
            { minWidth: sizes.touchMin, minHeight: sizes.touchMin },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="close" color={colors.textoApoio} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 4 },
  input: { flex: 1, paddingVertical: 12 },
  clear: { alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  pressed: { opacity: 0.7 },
});
