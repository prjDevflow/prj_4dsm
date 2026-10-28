import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { useReducedMotion, useTheme } from '@/theme';
import { FieldLabel, FieldMessage, fieldBoxStyle, fieldStyles } from './Field';
import { Header } from './Header';
import { ScreenContainer } from './ScreenContainer';
import { Text } from './Text';
import { TextField } from './TextField';

export type SelectOption<T extends string> = { value: T; label: string; description?: string };

type SelectFieldProps<T extends string> = {
  label: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  /** Shows a search box at the top of the list (long lists: people, places). */
  searchable?: boolean;
  searchPlaceholder?: string;
  help?: string;
  error?: string;
  disabled?: boolean;
};

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Field that opens the options in a full screen, with optional search. */
export const SelectField = <T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione',
  searchable = false,
  searchPlaceholder = 'Digite para buscar',
  help,
  error,
  disabled = false,
}: SelectFieldProps<T>) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);

  const visibleOptions = useMemo(() => {
    const search = normalize(query.trim());
    return search ? options.filter((option) => normalize(option.label).includes(search)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (option: SelectOption<T>) => {
    onChange(option.value);
    close();
  };

  return (
    <View style={fieldStyles.field}>
      <FieldLabel label={label} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        accessibilityHint={error ?? help}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[fieldBoxStyle(theme, { error: !!error }), disabled && styles.disabled]}
      >
        <Text color={selected ? 'texto' : 'contorno'} style={styles.value}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="arrow_drop_down" color={theme.colors.textoApoio} />
      </Pressable>
      <FieldMessage help={help} error={error} />

      <Modal visible={open} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={close}>
        <ScreenContainer scroll={false} header={<Header title={label} onBack={close} />}>
          {searchable ? (
            <TextField
              label="Buscar"
              placeholder={searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
          ) : null}
          <FlatList
            data={visibleOptions}
            keyExtractor={(option) => option.value}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text color="textoApoio">Nenhuma opção encontrada.</Text>}
            renderItem={({ item }) => {
              const checked = item.value === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.description}
                  accessibilityState={{ checked }}
                  onPress={() => choose(item)}
                  style={({ pressed }) => [
                    styles.option,
                    { borderBottomColor: theme.colors.contornoSuave },
                    pressed && { backgroundColor: theme.colors.superficieAlta },
                  ]}
                >
                  <View style={styles.optionTexts}>
                    <Text variant={theme.scale === 'admin' ? 'adminItem' : 'pessoaCorpoForte'}>
                      {item.label}
                    </Text>
                    {item.description ? (
                      <Text
                        variant={theme.scale === 'admin' ? 'adminApoio' : 'pessoaApoio'}
                        color="textoApoio"
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  {checked ? <Icon name="check" color={theme.colors.primaria} /> : null}
                </Pressable>
              );
            }}
          />
        </ScreenContainer>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  value: { flex: 1, paddingVertical: 12 },
  disabled: { opacity: 0.38 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionTexts: { flex: 1, gap: 2 },
});
