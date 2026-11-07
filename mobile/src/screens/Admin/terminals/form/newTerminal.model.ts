import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { loadErrorMessage } from '@/lib/apiMessages';
import type { ApiError } from '@/service/ApiError';
import type { IClipboardService } from '@/service/IDeviceService';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { ICreateTerminalService, IListTerminalsService } from '@/service/ITerminalService';
import { applyFieldErrors } from '@/screens/Shared/form/applyFieldErrors';
import { useDiscardGuard } from '@/screens/Shared/form/useDiscardGuard';
import { locationSaveError } from '../../locations/locations.messages';
import {
  locationsQueryKeys,
  placeLabel,
  useAccessPointsQuery,
  useBuildingsQuery,
  useTerminalsQuery,
} from '../../locations/locationsQueries';
import { useIssuedKey } from '../key/useIssuedKey';
import {
  terminalFormSchema,
  type TerminalFormOutput,
  type TerminalFormValues,
} from '../terminals.schema';

type NewTerminalModelProps = {
  listAccessPointsService: IListAccessPointsService;
  listBuildingsService: IListBuildingsService;
  listTerminalsService: IListTerminalsService;
  createTerminalService: ICreateTerminalService;
  clipboardService: IClipboardService;
  onClose: () => void;
};

// T21 (create) and then T22: the key of the new terminal, shown once.
export const useNewTerminalModel = ({
  listAccessPointsService,
  listBuildingsService,
  listTerminalsService,
  createTerminalService,
  clipboardService,
  onClose,
}: NewTerminalModelProps) => {
  const queryClient = useQueryClient();
  const form = useForm<TerminalFormValues, unknown, TerminalFormOutput>({
    resolver: zodResolver(terminalFormSchema),
    defaultValues: { nome: '', accessPointId: null },
  });
  const { isDirty } = form.formState;
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inFlight = useRef(false);
  const key = useIssuedKey(clipboardService);

  const accessPoints = useAccessPointsQuery(listAccessPointsService);
  const buildings = useBuildingsQuery(listBuildingsService);
  const terminals = useTerminalsQuery(listTerminalsService);
  const queries = [accessPoints, buildings, terminals];

  useEffect(
    () => form.subscribe({ formState: { values: true }, callback: () => setApiError(null) }),
    [form],
  );

  // One terminal per access point (B07): only active places without a terminal can be chosen.
  const accessPointOptions = useMemo(() => {
    const taken = new Set((terminals.data ?? []).map((terminal) => terminal.accessPointId));
    return (accessPoints.data ?? [])
      .filter((ap) => ap.ativo && !taken.has(ap.id))
      .map((ap) => ({ value: ap.id, label: placeLabel(ap.id, accessPoints.data, buildings.data) }));
  }, [accessPoints.data, buildings.data, terminals.data]);

  // Not a useMutation: its cache would keep the answer, and the answer carries the key.
  const submit = async (values: TerminalFormOutput) => {
    if (inFlight.current) return; // a double tap creates a single terminal
    inFlight.current = true;
    setIsSaving(true);
    setApiError(null);
    try {
      const { apiKey } = await createTerminalService.exec(values);
      key.showKey({ terminalName: values.nome, apiKey });
      void queryClient.invalidateQueries({ queryKey: locationsQueryKeys.all });
    } catch (error) {
      const { fields, banner } = locationSaveError(error as ApiError, 'terminal');
      applyFieldErrors(form.setError, fields);
      setApiError(banner);
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  };

  const loaded = queries.every((query) => query.data);
  const error = queries.find((query) => query.error && !query.data)?.error;

  return {
    form,
    status: loaded ? ('ready' as const) : error ? ('error' as const) : ('loading' as const),
    loadErrorMessage: error ? loadErrorMessage(error) : '',
    onRetryLoad: () => Promise.all(queries.map((query) => query.refetch())),
    accessPointOptions,
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving,
    apiError,
    isDirty,
    issuedKey: key.issuedKey,
    onCopyKey: key.onCopyKey,
    onDone: () => {
      key.clearKey();
      onClose();
    },
    // While the key is on screen, the back button belongs to it.
    ...useDiscardGuard(isDirty, onClose, key.issuedKey === null),
  };
};
