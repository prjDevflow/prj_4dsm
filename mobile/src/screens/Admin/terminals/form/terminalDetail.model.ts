import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui';
import { connectionMessage, loadErrorMessage, SAVE_FAILED } from '@/lib/apiMessages';
import { formatCoordinate } from '@/lib/coordinates';
import { seenAgo } from '@/lib/seenAgo';
import type { Terminal, UpdateTerminalBody } from '@/lib/types/locations';
import { useNow } from '@/lib/useNow';
import type { ApiError } from '@/service/ApiError';
import type { IClipboardService } from '@/service/IDeviceService';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type {
  IGetTerminalService,
  IRotateTerminalKeyService,
  IUpdateTerminalService,
} from '@/service/ITerminalService';
import { applyFieldErrors } from '@/screens/Shared/form/applyFieldErrors';
import { useDiscardGuard } from '@/screens/Shared/form/useDiscardGuard';
import type { FormStatus } from '../../locations/building/buildingForm.model';
import { locationSaveError } from '../../locations/locations.messages';
import {
  locationsQueryKeys,
  placeLabel,
  useAccessPointsQuery,
  useBuildingsQuery,
} from '../../locations/locationsQueries';
import { useIssuedKey } from '../key/useIssuedKey';
import { statusBadge, terminalStatus } from '../list/terminalsList.model';
import {
  terminalEditSchema,
  type TerminalEditOutput,
  type TerminalEditValues,
} from '../terminals.schema';

const REFRESH_MS = 15_000;

type TerminalDetailModelProps = {
  terminalId: string;
  getTerminalService: IGetTerminalService;
  updateTerminalService: IUpdateTerminalService;
  rotateTerminalKeyService: IRotateTerminalKeyService;
  listAccessPointsService: IListAccessPointsService;
  listBuildingsService: IListBuildingsService;
  clipboardService: IClipboardService;
  onClose: () => void;
  now?: () => Date;
};

const changedFields = (terminal: Terminal, values: TerminalEditOutput): UpdateTerminalBody => {
  const body: UpdateTerminalBody = {};
  if (values.nome !== terminal.nome) body.nome = values.nome;
  if (values.ativo !== terminal.ativo) body.ativo = values.ativo;
  return body;
};

// T21 (detail): status, place, name, active switch and "Gerar nova chave" (then T22).
export const useTerminalDetailModel = ({
  terminalId,
  getTerminalService,
  updateTerminalService,
  rotateTerminalKeyService,
  listAccessPointsService,
  listBuildingsService,
  clipboardService,
  onClose,
  now: clock,
}: TerminalDetailModelProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<TerminalEditValues, unknown, TerminalEditOutput>({
    resolver: zodResolver(terminalEditSchema),
    defaultValues: { nome: '', ativo: true },
  });
  const { isDirty } = form.formState;
  const [apiError, setApiError] = useState<string | null>(null);
  const [rotateDialogVisible, setRotateDialogVisible] = useState(false);
  const [rotating, setRotating] = useState(false);
  const inFlight = useRef(false);
  const key = useIssuedKey(clipboardService);
  const now = useNow(clock);

  const terminalQuery = useQuery<Terminal, ApiError>({
    queryKey: locationsQueryKeys.terminal(terminalId),
    queryFn: () => getTerminalService.exec(terminalId),
    refetchInterval: REFRESH_MS,
  });
  const terminal = terminalQuery.data;
  const accessPoints = useAccessPointsQuery(listAccessPointsService);
  const buildings = useBuildingsQuery(listBuildingsService);

  useEffect(() => {
    if (terminal) {
      form.reset({ nome: terminal.nome, ativo: terminal.ativo }, { keepDirtyValues: true });
    }
  }, [terminal, form]);

  useEffect(
    () => form.subscribe({ formState: { values: true }, callback: () => setApiError(null) }),
    [form],
  );

  const save = useMutation<Terminal, ApiError, UpdateTerminalBody>({
    mutationFn: (body) => updateTerminalService.exec(terminalId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: locationsQueryKeys.all });
      toast.show('Alterações salvas.');
      onClose();
    },
    onError: (error) => {
      const { fields, banner } = locationSaveError(error, 'terminal');
      applyFieldErrors(form.setError, fields);
      setApiError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submit = (values: TerminalEditOutput) => {
    if (inFlight.current || !terminal) return;
    const body = changedFields(terminal, values);
    if (Object.keys(body).length === 0) {
      onClose(); // nothing changed: nothing to send
      return;
    }
    inFlight.current = true;
    setApiError(null);
    save.mutate(body);
  };

  // Not a useMutation: its cache would keep the answer, and the answer carries the key.
  const onConfirmRotate = async () => {
    if (rotating || !terminal) return;
    setRotating(true);
    try {
      const { apiKey } = await rotateTerminalKeyService.exec(terminalId);
      setRotateDialogVisible(false);
      key.showKey({ terminalName: terminal.nome, apiKey });
    } catch (error) {
      setRotateDialogVisible(false);
      setApiError(connectionMessage(error as ApiError) ?? SAVE_FAILED);
    } finally {
      setRotating(false);
    }
  };

  const status: FormStatus = terminal
    ? 'ready'
    : terminalQuery.isError
      ? terminalQuery.error.status === 404
        ? 'notFound'
        : 'error'
      : 'loading';

  return {
    form,
    status,
    title: terminal?.nome ?? 'Terminal',
    badge: terminal ? statusBadge[terminalStatus(terminal)] : null,
    seen: terminal ? seenAgo(terminal.ultimoContatoEm, now) : '',
    // Last position sent by the terminal (GPS), when there is one.
    position:
      terminal?.ultimaLat != null && terminal.ultimaLon != null
        ? `${formatCoordinate(terminal.ultimaLat)}, ${formatCoordinate(terminal.ultimaLon)}`
        : null,
    place: terminal ? placeLabel(terminal.accessPointId, accessPoints.data, buildings.data) : '',
    loadErrorMessage: terminalQuery.error ? loadErrorMessage(terminalQuery.error) : '',
    onRetryLoad: () => terminalQuery.refetch(),
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving: save.isPending,
    apiError,
    isDirty,
    rotateDialogVisible,
    rotating,
    onRequestRotate: () => setRotateDialogVisible(true),
    onCancelRotate: () => setRotateDialogVisible(false),
    onConfirmRotate,
    issuedKey: key.issuedKey,
    onCopyKey: key.onCopyKey,
    // "Concluir" goes back to the detail: the old key no longer works, the new one is gone from the app.
    onDone: key.clearKey,
    ...useDiscardGuard(isDirty, onClose, key.issuedKey === null),
  };
};
