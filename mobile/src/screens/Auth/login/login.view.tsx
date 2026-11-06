import { Controller } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Cookie12 } from '@/components/shapes';
import { Alert, Button, PasswordField, ScreenContainer, Text, TextField } from '@/components/ui';
import { colors } from '@/theme';
import type { useLoginModel } from './login.model';

type LoginViewProps = ReturnType<typeof useLoginModel> & {
  appVersion: string;
  showDevTools: boolean;
  onOpenDevTools: () => void;
};

// T02 Login (Figma "Passe").
export const LoginView = ({
  form,
  onSubmit,
  apiError,
  sessionExpired,
  isSubmitting,
  appVersion,
  showDevTools,
  onOpenDevTools,
}: LoginViewProps) => {
  // Called without arguments: the keyboard event of React Native is not a form event.
  const submit = () => form.handleSubmit(onSubmit)();

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.brand}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Cookie12 color={colors.primaria} size={48}>
            <Icon name="check" size={24} color={colors.primariaSobre} />
          </Cookie12>
        </View>
        <Text variant="pessoaDestaque">Passe</Text>
      </View>

      <View style={styles.titles}>
        <Text variant="pessoaApoio" color="textoApoio">
          Controle de Acesso
        </Text>
        <Text variant="pessoaTitulo" accessibilityRole="header">
          Entre com sua conta
        </Text>
      </View>

      {sessionExpired ? (
        <Alert tone="info" icon="lock_clock" message="Sua sessão expirou. Entre novamente." />
      ) : null}

      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label="E-mail"
            placeholder="nome@email.com"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            autoFocus
            maxLength={254}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => form.setFocus('senha')}
            editable={!isSubmitting}
          />
        )}
      />

      <Controller
        control={form.control}
        name="senha"
        render={({ field, fieldState }) => (
          <PasswordField
            ref={field.ref}
            label="Senha"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            textContentType="password"
            maxLength={72}
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!isSubmitting}
          />
        )}
      />

      {apiError ? <Alert tone="erro" message={apiError} /> : null}

      <Button label="Entrar" loadingLabel="Entrando…" loading={isSubmitting} onPress={submit} />

      <Text variant="pessoaApoio" color="textoApoio">
        Problemas para entrar? Procure a administração.
      </Text>

      <View style={styles.footer}>
        <Text variant="adminLegenda" color="textoApoio">
          {`Versão ${appVersion}`}
        </Text>
        {showDevTools ? (
          <Button
            variant="texto"
            size="admin"
            label="Ferramentas de desenvolvimento"
            onPress={onOpenDevTools}
            fullWidth={false}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { gap: 20, paddingTop: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { gap: 4, marginTop: 8 },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 16,
  },
});
