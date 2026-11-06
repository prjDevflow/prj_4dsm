import { Controller, type Control } from 'react-hook-form';
import { Platform, StyleSheet, View } from 'react-native';
import { Alert, Button, Text, TextField } from '@/components/ui';

export type CoordinateValues = { latitude: string; longitude: string };

type CoordinateFieldsProps = {
  /** The form of the building or of the access point (both have latitude and longitude). */
  control: Control<CoordinateValues>;
  locating: boolean;
  locationError: string | null;
  onUseCurrentLocation: () => unknown;
};

// iOS has no minus sign on the decimal pad; Android's numeric keyboard has it.
const keyboardType = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

/** "Localização" of T18 and T19: the button that reads the position and the two fields. */
export const CoordinateFields = ({
  control,
  locating,
  locationError,
  onUseCurrentLocation,
}: CoordinateFieldsProps) => (
  <View style={styles.block}>
    <Text variant="adminRotulo">Localização</Text>
    <Button
      variant="tonal"
      icon="my_location"
      label="Usar minha localização atual"
      loadingLabel="Obtendo localização…"
      loading={locating}
      onPress={onUseCurrentLocation}
    />
    {locationError ? <Alert tone="aviso" message={locationError} /> : null}
    <View style={styles.row}>
      {(
        [
          ['latitude', 'Latitude', 'Entre -90 e 90'],
          ['longitude', 'Longitude', 'Entre -180 e 180'],
        ] as const
      ).map(([name, label, help]) => (
        <View key={name} style={styles.cell}>
          <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label={label}
                help={help}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType={keyboardType}
                autoCorrect={false}
                maxLength={20}
              />
            )}
          />
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  block: { gap: 12 },
  // With a large system font the two fields wrap one under the other.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexGrow: 1, flexBasis: 140 },
});
