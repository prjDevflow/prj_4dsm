import { CameraView } from 'expo-camera';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Alert, Button, SegmentedField, Text, TextField } from '@/components/ui';
import { colors, radius, sizes } from '@/theme';
import { MessageScreen } from '../MessageScreen';
import type { useScannerModel } from './scanner.model';

type ScannerViewProps = ReturnType<typeof useScannerModel> & {
  onBack: () => void;
  /** The field to paste the text of a QR, for testing without a camera. */
  devPaste: boolean;
};

const WRONG_QR = 'Este não é o QR Code da catraca.';

const simulatedPositions: { value: ScannerViewProps['simulatedPosition']; label: string }[] = [
  { value: 'real', label: 'Real' },
  { value: 'catraca', label: 'Na catraca' },
  { value: 'longe', label: 'A 200 m' },
];

type DevToolsProps = Pick<ScannerViewProps, 'onRead' | 'simulatedPosition' | 'onSimulatePosition'>;

// In `__DEV__` only: to rehearse the M4 without a QR on a screen and without walking to the turnstile.
const DevTools = ({ onRead, simulatedPosition, onSimulatePosition }: DevToolsProps) => {
  const [text, setText] = useState('');

  return (
    <View style={styles.devPaste}>
      <SegmentedField
        label="Simular posição"
        options={simulatedPositions}
        value={simulatedPosition}
        onChange={onSimulatePosition}
      />
      <TextField
        label="Texto do QR Code"
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button variant="contorno" label="Usar este texto" onPress={() => onRead(text.trim())} />
    </View>
  );
};

const corners = [
  { top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: radius.cartao },
  { top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: radius.cartao },
  {
    bottom: 0,
    left: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: radius.cartao,
  },
  {
    bottom: 0,
    right: 0,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderBottomRightRadius: radius.cartao,
  },
];

const ScannerFrame = () => (
  <View testID="scanner-frame" style={styles.frame}>
    {corners.map((corner, index) => (
      <View key={index} style={[styles.corner, corner]} />
    ))}
  </View>
);

type ReaderProps = Pick<
  ScannerViewProps,
  | 'noticeVisible'
  | 'torchOn'
  | 'positionReady'
  | 'simulatedPosition'
  | 'onRead'
  | 'onCameraError'
  | 'onToggleTorch'
  | 'onSimulatePosition'
  | 'onBack'
  | 'devPaste'
>;

// T07 Leitor (Figma "Passe"), everything floating over the camera.
const Reader = ({
  noticeVisible,
  torchOn,
  positionReady,
  simulatedPosition,
  onRead,
  onCameraError,
  onToggleTorch,
  onSimulatePosition,
  onBack,
  devPaste,
}: ReaderProps) => (
  <View style={styles.reader}>
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      enableTorch={torchOn}
      onBarcodeScanned={({ data }) => onRead(data)}
      onMountError={onCameraError}
    />
    <SafeAreaView style={styles.overlay}>
      <View style={styles.instruction}>
        <Icon name="qr_code_scanner" color={colors.primaria} />
        <Text variant="pessoaCorpoForte" accessibilityRole="header" style={styles.fill}>
          Aponte a câmera para o QR Code da catraca.
        </Text>
      </View>

      <View style={styles.center}>
        <ScannerFrame />
        {noticeVisible ? (
          <Alert tone="aviso" message={WRONG_QR} />
        ) : (
          <Text variant="pessoaApoio" style={styles.hint}>
            O QR Code muda a cada 10 segundos. Se der erro, leia o novo.
          </Text>
        )}
        {positionReady ? (
          <View style={styles.positionReady}>
            <Icon name="location_on" size={18} color={colors.sucessoContainerSobre} />
            <Text variant="pessoaApoio" color="sucessoContainerSobre">
              Localização pronta
            </Text>
          </View>
        ) : null}
      </View>

      {devPaste ? (
        <DevTools
          onRead={onRead}
          simulatedPosition={simulatedPosition}
          onSimulatePosition={onSimulatePosition}
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Icon name="arrow_back" color={colors.branco} />
        </Pressable>
        <View style={styles.fill}>
          <Button
            variant="tonal"
            icon={torchOn ? 'flashlight_off' : 'flashlight_on'}
            label={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
            onPress={onToggleTorch}
          />
        </View>
      </View>
    </SafeAreaView>
  </View>
);

export const ScannerView = ({
  status,
  noticeVisible,
  torchOn,
  positionReady,
  simulatedPosition,
  onAllow,
  onOpenSettings,
  onCameraError,
  onToggleTorch,
  onSimulatePosition,
  onRead,
  onBack,
  devPaste,
}: ScannerViewProps) => {
  if (status === 'checking') return <View style={styles.reader} />;

  if (status === 'ask') {
    return (
      <MessageScreen
        icon="photo_camera"
        title="Precisamos da câmera para ler o QR Code da catraca."
        footer={
          <>
            <Button label="Permitir câmera" onPress={onAllow} />
            <Button variant="texto" label="Agora não" onPress={onBack} />
          </>
        }
      />
    );
  }

  if (status === 'denied') {
    return (
      <MessageScreen
        icon="no_photography"
        title="Sem acesso à câmera, não é possível ler o QR Code."
        footer={
          <>
            <Button label="Abrir configurações" onPress={onOpenSettings} />
            <Button variant="texto" label="Voltar" onPress={onBack} />
          </>
        }
      />
    );
  }

  if (status === 'unavailable') {
    return (
      <MessageScreen
        icon="no_photography"
        title="Câmera indisponível neste aparelho."
        footer={<Button variant="texto" label="Voltar" onPress={onBack} />}
      >
        {noticeVisible ? <Alert tone="aviso" message={WRONG_QR} /> : null}
        {devPaste ? (
          <DevTools
            onRead={onRead}
            simulatedPosition={simulatedPosition}
            onSimulatePosition={onSimulatePosition}
          />
        ) : null}
      </MessageScreen>
    );
  }

  return (
    <Reader
      noticeVisible={noticeVisible}
      torchOn={torchOn}
      positionReady={positionReady}
      simulatedPosition={simulatedPosition}
      onRead={onRead}
      onCameraError={onCameraError}
      onToggleTorch={onToggleTorch}
      onSimulatePosition={onSimulatePosition}
      onBack={onBack}
      devPaste={devPaste}
    />
  );
};

const FRAME_SIZE = 240;
const CORNER_SIZE = 56;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  reader: { flex: 1, backgroundColor: colors.fundoLeitor },
  overlay: { flex: 1, gap: 16, paddingHorizontal: 16, paddingVertical: 8 },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.cartao,
    backgroundColor: colors.superficieAlta,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.acao,
  },
  // Over the live camera the text needs its own background to stay readable.
  hint: {
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.alerta,
    overflow: 'hidden',
    backgroundColor: colors.fundoLeitor,
  },
  positionReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pilula,
    backgroundColor: colors.sucessoContainer,
  },
  devPaste: {
    gap: 8,
    padding: 12,
    borderRadius: radius.cartao,
    backgroundColor: colors.superficieAlta,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: sizes.buttonPessoa,
    height: sizes.buttonPessoa,
    borderRadius: sizes.buttonPessoa / 2,
    borderWidth: 1,
    borderColor: colors.contorno,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fundoLeitor,
  },
  pressed: { opacity: 0.7 },
});
