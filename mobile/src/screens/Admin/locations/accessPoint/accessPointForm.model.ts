import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui';
import { loadErrorMessage } from '@/lib/apiMessages';
import { formatCoordinate } from '@/lib/coordinates';
import type { PontoDeAcesso, UpdateAccessPointBody } from '@/lib/types/locations';
import type { ApiError } from '@/service/ApiError';
import type { ICurrentPositionService } from '@/service/IDeviceService';
import type {
  ICreateAccessPointService,
  IListAccessPointsService,
  IListBuildingsService,
  IUpdateAccessPointService,
} from '@/service/ILocationService';
import { applyFieldErrors } from '@/screens/Shared/form/applyFieldErrors';
import { useDiscardGuard } from '@/screens/Shared/form/useDiscardGuard';
import type { FormStatus } from '../building/buildingForm.model';
import { locationSaveError } from '../locations.messages';
import {
  locationsQueryKeys,
  tipoLabels,
  useAccessPointsQuery,
  useBuildingsQuery,
} from '../locationsQueries';
import {
  accessPointFormSchema,
  type AccessPointFormOutput,
  type AccessPointFormValues,
} from '../locations.schema';
import { useCurrentPositionFill } from '../shared/useCurrentPositionFill';

type AccessPointFormModelProps = {
  /** Without it the form creates an access point; with it, it edits that one. */
  accessPointId?: string;
  /** "Adicionar local" of a building opens the form with that building already chosen. */
  initialBuildingId?: string;
  listBuildingsService: IListBuildingsService;
  listAccessPointsService: IListAccessPointsService;
  createAccessPointService: ICreateAccessPointService;
  updateAccessPointService: IUpdateAccessPointService;
  currentPositionService: ICurrentPositionService;
  onClose: () => void;
};

const toFormValues = (ap: PontoDeAcesso): AccessPointFormValues => ({
  buildingId: ap.buildingId,
  tipo: ap.tipo,
  nome: ap.nome,
  identificacao: ap.identificacao,
  latitude: formatCoordinate(ap.latitude),
  longitude: formatCoordinate(ap.longitude),
  ativo: ap.ativo,
});

/** PATCH body: only what changed, and never the building (the API answers 422). */
const changedFields = (ap: PontoDeAcesso, values: AccessPointFormOutput): UpdateAccessPointBody => {
  const { buildingId: _fixed, ...editable } = values;
  return Object.fromEntries(
    (Object.keys(editable) as (keyof typeof editable)[])
      .filter((key) => editable[key] !== ap[key])
      .map((key) => [key, editable[key]]),
  );
};

export const tipoOptions = (Object.keys(tipoLabels) as (keyof typeof tipoLabels)[]).map(
  (value) => ({ value, label: tipoLabels[value] }),
);

// T19: create and edit an access point (portaria, porta or catraca) of a building.
export const useAccessPointFormModel = ({
  accessPointId,
  initialBuildingId,
  listBuildingsService,
  listAccessPointsService,
  createAccessPointService,
  updateAccessPointService,
  currentPositionService,
  onClose,
}: AccessPointFormModelProps) => {
  const mode = accessPointId ? 'edit' : 'create';
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<AccessPointFormValues, unknown, AccessPointFormOutput>({
    resolver: zodResolver(accessPointFormSchema),
    defaultValues: {
      buildingId: initialBuildingId ?? null,
      tipo: null,
      nome: '',
      identificacao: '',
      latitude: '',
      longitude: '',
      ativo: true,
    },
  });
  const { isDirty } = form.formState;
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const buildings = useBuildingsQuery(listBuildingsService);
  const accessPoints = useAccessPointsQuery(listAccessPointsService, mode === 'edit');
  const accessPoint = accessPoints.data?.find((candidate) => candidate.id === accessPointId);

  useEffect(() => {
    if (accessPoint) form.reset(toFormValues(accessPoint), { keepDirtyValues: true });
  }, [accessPoint, form]);

  useEffect(
    () => form.subscribe({ formState: { values: true }, callback: () => setApiError(null) }),
    [form],
  );

  // A new place only goes into an active building; on edit the building is shown but fixed.
  const buildingOptions = useMemo(
    () =>
      (buildings.data ?? [])
        .filter((building) => mode === 'edit' || building.ativo)
        .map((building) => ({ value: building.id, label: building.nome })),
    [buildings.data, mode],
  );

  const location = useCurrentPositionFill(currentPositionService, (latitude, longitude) => {
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
    form.setValue('latitude', latitude, options);
    form.setValue('longitude', longitude, options);
  });

  const save = useMutation<PontoDeAcesso, ApiError, AccessPointFormOutput | UpdateAccessPointBody>({
    mutationFn: (body) =>
      mode === 'create'
        ? createAccessPointService.exec(body as AccessPointFormOutput)
        : updateAccessPointService.exec(accessPointId ?? '', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: locationsQueryKeys.all });
      toast.show(mode === 'create' ? 'Local cadastrado.' : 'Alterações salvas.');
      onClose();
    },
    onError: (error) => {
      const { fields, banner } = locationSaveError(error, 'accessPoint');
      applyFieldErrors(form.setError, fields);
      setApiError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submit = (values: AccessPointFormOutput) => {
    if (inFlight.current) return; // a double tap sends a single request
    const body = mode === 'create' || !accessPoint ? values : changedFields(accessPoint, values);
    if (Object.keys(body).length === 0) {
      onClose(); // nothing changed: nothing to send
      return;
    }
    inFlight.current = true;
    setApiError(null);
    save.mutate(body);
  };

  const loading = mode === 'edit' ? accessPoints : buildings;
  const status: FormStatus =
    (mode === 'create' && buildings.data) || accessPoint
      ? 'ready'
      : mode === 'edit' && accessPoints.data
        ? 'notFound'
        : loading.isError
          ? 'error'
          : 'loading';

  return {
    form,
    mode,
    title: mode === 'create' ? 'Novo local' : 'Editar local',
    status,
    buildingOptions,
    loadErrorMessage: loading.error ? loadErrorMessage(loading.error) : '',
    onRetryLoad: () => Promise.all([buildings.refetch(), accessPoints.refetch()]),
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving: save.isPending,
    apiError,
    isDirty,
    ...location,
    ...useDiscardGuard(isDirty, onClose),
  };
};
