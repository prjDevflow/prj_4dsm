import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui';
import { loadErrorMessage } from '@/lib/apiMessages';
import { formatCoordinate } from '@/lib/coordinates';
import type { Edificio, UpdateBuildingBody } from '@/lib/types/locations';
import type { ApiError } from '@/service/ApiError';
import type { ICurrentPositionService } from '@/service/IDeviceService';
import type {
  ICreateBuildingService,
  IListBuildingsService,
  IUpdateBuildingService,
} from '@/service/ILocationService';
import { applyFieldErrors } from '@/screens/Shared/form/applyFieldErrors';
import { useDiscardGuard } from '@/screens/Shared/form/useDiscardGuard';
import { locationSaveError } from '../locations.messages';
import { locationsQueryKeys, useBuildingsQuery } from '../locationsQueries';
import {
  buildingFormSchema,
  type BuildingFormOutput,
  type BuildingFormValues,
} from '../locations.schema';
import { useCurrentPositionFill } from '../shared/useCurrentPositionFill';

export type FormStatus = 'loading' | 'error' | 'notFound' | 'ready';

type BuildingFormModelProps = {
  /** Without it the form creates a building; with it, it edits that one. */
  buildingId?: string;
  listBuildingsService: IListBuildingsService;
  createBuildingService: ICreateBuildingService;
  updateBuildingService: IUpdateBuildingService;
  currentPositionService: ICurrentPositionService;
  onClose: () => void;
};

const emptyBuilding: BuildingFormValues = {
  nome: '',
  endereco: '',
  latitude: '',
  longitude: '',
  ativo: true,
};

const toFormValues = (building: Edificio): BuildingFormValues => ({
  nome: building.nome,
  endereco: building.endereco,
  latitude: formatCoordinate(building.latitude),
  longitude: formatCoordinate(building.longitude),
  ativo: building.ativo,
});

/** PATCH body: only what changed. */
const changedFields = (building: Edificio, values: BuildingFormOutput): UpdateBuildingBody =>
  Object.fromEntries(
    (Object.keys(values) as (keyof BuildingFormOutput)[])
      .filter((key) => values[key] !== building[key])
      .map((key) => [key, values[key]]),
  );

// T18: create and edit a building. There is no GET of one building: it comes from the list.
export const useBuildingFormModel = ({
  buildingId,
  listBuildingsService,
  createBuildingService,
  updateBuildingService,
  currentPositionService,
  onClose,
}: BuildingFormModelProps) => {
  const mode = buildingId ? 'edit' : 'create';
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<BuildingFormValues, unknown, BuildingFormOutput>({
    resolver: zodResolver(buildingFormSchema),
    defaultValues: emptyBuilding,
  });
  const { isDirty } = form.formState;
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const buildings = useBuildingsQuery(listBuildingsService, mode === 'edit');
  const building = buildings.data?.find((candidate) => candidate.id === buildingId);

  useEffect(() => {
    if (building) form.reset(toFormValues(building), { keepDirtyValues: true });
  }, [building, form]);

  useEffect(
    () => form.subscribe({ formState: { values: true }, callback: () => setApiError(null) }),
    [form],
  );

  const location = useCurrentPositionFill(currentPositionService, (latitude, longitude) => {
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
    form.setValue('latitude', latitude, options);
    form.setValue('longitude', longitude, options);
  });

  const save = useMutation<Edificio, ApiError, BuildingFormOutput | UpdateBuildingBody>({
    mutationFn: (body) =>
      mode === 'create'
        ? createBuildingService.exec(body as BuildingFormOutput)
        : updateBuildingService.exec(buildingId ?? '', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: locationsQueryKeys.all });
      toast.show(mode === 'create' ? 'Edifício cadastrado.' : 'Alterações salvas.');
      onClose();
    },
    onError: (error) => {
      const { fields, banner } = locationSaveError(error, 'building');
      applyFieldErrors(form.setError, fields);
      setApiError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submit = (values: BuildingFormOutput) => {
    if (inFlight.current) return; // a double tap sends a single request
    const body = mode === 'create' || !building ? values : changedFields(building, values);
    if (Object.keys(body).length === 0) {
      onClose(); // nothing changed: nothing to send
      return;
    }
    inFlight.current = true;
    setApiError(null);
    save.mutate(body);
  };

  const status: FormStatus =
    mode === 'create' || building
      ? 'ready'
      : buildings.data
        ? 'notFound'
        : buildings.isError
          ? 'error'
          : 'loading';

  return {
    form,
    title: mode === 'create' ? 'Novo edifício' : 'Editar edifício',
    status,
    loadErrorMessage: buildings.error ? loadErrorMessage(buildings.error) : '',
    onRetryLoad: () => buildings.refetch(),
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving: save.isPending,
    apiError,
    isDirty,
    ...location,
    ...useDiscardGuard(isDirty, onClose),
  };
};
