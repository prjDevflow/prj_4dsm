import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useToast } from '@/components/ui';
import { loadErrorMessage } from '@/lib/apiMessages';
import { toIsoDate } from '@/lib/dateValue';
import type { Autorizacao } from '@/lib/types/authorizations';
import type { ApiError } from '@/service/ApiError';
import type { ICreateAuthorizationService } from '@/service/IAuthorizationService';
import type { IListAccessPointsService, IListBuildingsService } from '@/service/ILocationService';
import type { IListUsersService } from '@/service/IUserService';
import { applyFieldErrors } from '@/screens/Shared/form/applyFieldErrors';
import { useDiscardGuard } from '@/screens/Shared/form/useDiscardGuard';
import {
  placeOptions,
  useAccessPointsQuery,
  useBuildingsQuery,
} from '../../locations/locationsQueries';
import { personOption, usePeopleQuery } from '../../users/usersQueries';
import { authorizationsQueryKeys } from '../authorizationsQueries';
import { authorizationSaveError } from './authorizationForm.messages';
import {
  authorizationFormSchema,
  type AuthorizationFormOutput,
  type AuthorizationFormValues,
} from './authorizationForm.schema';
import { buildSummary } from './authorizationForm.summary';
import { nextSevenDays, onlyToday } from './period';

const systemClock = () => new Date();

type NewAuthorizationModelProps = {
  listUsersService: IListUsersService;
  listBuildingsService: IListBuildingsService;
  listAccessPointsService: IListAccessPointsService;
  createAuthorizationService: ICreateAuthorizationService;
  onClose: () => void;
  /** Tests fix the clock; the app uses the phone's. */
  now?: () => Date;
};

// T24: the eight fields of RF03, a summary in plain words and the server rules checked first.
export const useNewAuthorizationModel = ({
  listUsersService,
  listBuildingsService,
  listAccessPointsService,
  createAuthorizationService,
  onClose,
  now = systemClock,
}: NewAuthorizationModelProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [today] = useState(() => toIsoDate(now()));
  const schema = useMemo(() => authorizationFormSchema(today), [today]);
  const form = useForm<AuthorizationFormValues, unknown, AuthorizationFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      usuarioId: null,
      accessPointId: null,
      dataInicio: today,
      dataFim: today,
      horaInicio: '08:00',
      horaFim: '18:00',
      usosPermitidos: 1,
    },
  });
  const { isDirty } = form.formState;
  const values = useWatch({ control: form.control });
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Only active people and places can receive an authorization (the server answers 422).
  const users = usePeopleQuery(listUsersService, { onlyActive: true });
  const buildings = useBuildingsQuery(listBuildingsService);
  const accessPoints = useAccessPointsQuery(listAccessPointsService);
  const queries = [users, buildings, accessPoints];

  useEffect(
    () => form.subscribe({ formState: { values: true }, callback: () => setApiError(null) }),
    [form],
  );

  const personOptions = useMemo(() => (users.data ?? []).map(personOption), [users.data]);

  const activePlaceOptions = useMemo(
    () =>
      placeOptions(
        (accessPoints.data ?? []).filter((ap) => ap.ativo),
        (buildings.data ?? []).filter((building) => building.ativo),
      ),
    [accessPoints.data, buildings.data],
  );

  // Built from the same object that goes to the API, and only when it would be accepted.
  const summary = useMemo(() => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return null;
    const person = users.data?.find((user) => user.id === parsed.data.usuarioId);
    const ap = accessPoints.data?.find((point) => point.id === parsed.data.accessPointId);
    const building = buildings.data?.find((candidate) => candidate.id === ap?.buildingId);
    if (!person || !ap || !building) return null;
    return buildSummary(parsed.data, {
      pessoa: person.nome,
      local: ap.nome,
      edificio: building.nome,
    });
  }, [schema, values, users.data, accessPoints.data, buildings.data]);

  const setDates = ({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) => {
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
    form.setValue('dataInicio', dataInicio, options);
    form.setValue('dataFim', dataFim, options);
  };

  const save = useMutation<Autorizacao, ApiError, AuthorizationFormOutput>({
    mutationFn: (body) => createAuthorizationService.exec(body),
    onSuccess: () => {
      // The list refetches behind this screen: the new one is at the top on return.
      void queryClient.invalidateQueries({ queryKey: authorizationsQueryKeys.all });
      toast.show('Autorização criada.');
      onClose();
    },
    onError: (error) => {
      const { fields, banner } = authorizationSaveError(error);
      applyFieldErrors(form.setError, fields);
      setApiError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submit = (body: AuthorizationFormOutput) => {
    if (inFlight.current) return; // a double tap creates a single authorization
    inFlight.current = true;
    setApiError(null);
    save.mutate(body);
  };

  const loaded = queries.every((query) => query.data);
  const error = queries.find((query) => query.error && !query.data)?.error;

  return {
    form,
    status: loaded ? ('ready' as const) : error ? ('error' as const) : ('loading' as const),
    loadErrorMessage: error ? loadErrorMessage(error) : '',
    onRetryLoad: () => Promise.all(queries.map((query) => query.refetch())),
    personOptions,
    placeOptions: activePlaceOptions,
    hasNoPeople: loaded && personOptions.length === 0,
    hasNoPlaces: loaded && activePlaceOptions.length === 0,
    summary,
    // The picker of the end date does not even offer a day before the start.
    minEndDate: values.dataInicio ?? undefined,
    onOnlyToday: () => setDates(onlyToday(now())),
    onNextSevenDays: () => setDates(nextSevenDays(now())),
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving: save.isPending,
    apiError,
    isDirty,
    ...useDiscardGuard(isDirty, onClose),
  };
};
