import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { services } from '@/service/container';
import { useNewTerminalModel } from './newTerminal.model';
import { NewTerminalView } from './newTerminal.view';
import { useTerminalDetailModel } from './terminalDetail.model';
import { TerminalDetailView } from './terminalDetail.view';

const useClose = () => {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/admin/terminals'));
};

/** "/admin/terminals/new": T21 and then the key (T22). */
export const NewTerminalPage = () => {
  const methods = useNewTerminalModel({
    listAccessPointsService: services.listAccessPoints,
    listBuildingsService: services.listBuildings,
    listTerminalsService: services.listTerminals,
    createTerminalService: services.createTerminal,
    clipboardService: services.clipboard,
    onClose: useClose(),
  });

  return (
    <>
      {/* The key screen leaves only by "Concluir"; a form with changes, only by its buttons. */}
      <Stack.Screen options={{ gestureEnabled: !methods.isDirty && !methods.issuedKey }} />
      <NewTerminalView {...methods} />
    </>
  );
};

/** "/admin/terminals/<id>": T21 detail, and T22 after "Gerar nova chave". */
export const TerminalDetailPage = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const methods = useTerminalDetailModel({
    terminalId: id ?? '',
    getTerminalService: services.getTerminal,
    updateTerminalService: services.updateTerminal,
    rotateTerminalKeyService: services.rotateTerminalKey,
    listAccessPointsService: services.listAccessPoints,
    listBuildingsService: services.listBuildings,
    clipboardService: services.clipboard,
    onClose: useClose(),
  });

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !methods.isDirty && !methods.issuedKey }} />
      <TerminalDetailView {...methods} />
    </>
  );
};
