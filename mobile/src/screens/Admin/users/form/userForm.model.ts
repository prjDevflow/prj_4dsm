import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BackHandler } from 'react-native';
import { useToast } from '@/components/ui';
import type { CreateUserBody, UpdateUserBody, UsuarioCompleto } from '@/lib/types/users';
import type { ApiError } from '@/service/ApiError';
import type {
  ICreateUserService,
  IGetUserService,
  IUpdateUserService,
} from '@/service/IUserService';
import { loadErrorMessage as loadErrorText, saveError } from '../users.messages';
import { usersQueryKeys } from '../usersQueryKeys';
import { changedFields, toCreateBody, toFormValues } from './userForm.mappers';
import {
  emptyUserForm,
  userFormSchema,
  type UserFormMode,
  type UserFormOutput,
  type UserFormValues,
} from './userForm.schema';

export type UserFormStatus = 'loading' | 'error' | 'notFound' | 'ready';

type UserFormModelProps = {
  /** Without it the form creates a user; with it, it edits that user. */
  userId?: string;
  getUserService: IGetUserService;
  createUserService: ICreateUserService;
  updateUserService: IUpdateUserService;
  /** Leaves the screen (after saving, or when the person gives up). */
  onClose: () => void;
};

type SaveVariables = { body: CreateUserBody | UpdateUserBody };

// T16: create and edit. Errors of the API go to the field they belong to, or to the strip.
export const useUserFormModel = ({
  userId,
  getUserService,
  createUserService,
  updateUserService,
  onClose,
}: UserFormModelProps) => {
  const mode: UserFormMode = userId ? 'edit' : 'create';
  const queryClient = useQueryClient();
  const toast = useToast();
  const schema = useMemo(() => userFormSchema(mode), [mode]);
  const form = useForm<UserFormValues, unknown, UserFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: emptyUserForm,
  });
  const { isDirty } = form.formState;
  const [apiError, setApiError] = useState<string | null>(null);
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);
  const inFlight = useRef(false);

  const userQuery = useQuery<UsuarioCompleto, ApiError>({
    queryKey: usersQueryKeys.detail(userId ?? ''),
    queryFn: () => getUserService.exec(userId ?? ''),
    enabled: mode === 'edit',
  });
  const user = userQuery.data;

  // A refetch never wipes what the person already typed.
  useEffect(() => {
    if (user) form.reset(toFormValues(user), { keepDirtyValues: true });
  }, [user, form]);

  // The strip goes away as soon as the person changes something.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: () => setApiError(null),
      }),
    [form],
  );

  const save = useMutation<UsuarioCompleto, ApiError, SaveVariables>({
    mutationFn: ({ body }) =>
      mode === 'create'
        ? createUserService.exec(body as CreateUserBody)
        : updateUserService.exec(userId ?? '', body),
    onSuccess: (saved) => {
      queryClient.setQueryData(usersQueryKeys.detail(saved.id), saved);
      // The list refetches in the background: the new or changed user is there on return.
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
      toast.show(mode === 'create' ? 'Usuário cadastrado.' : 'Alterações salvas.');
      onClose();
    },
    onError: (error, { body }) => {
      const { fields, banner } = saveError(error, body);
      Object.entries(fields).forEach(([name, message], index) =>
        form.setError(
          name as keyof UserFormValues,
          { type: 'server', message },
          { shouldFocus: index === 0 },
        ),
      );
      setApiError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submit = (values: UserFormOutput) => {
    if (inFlight.current) return; // a double tap sends a single request
    let body: CreateUserBody | UpdateUserBody;
    if (mode === 'create') {
      body = toCreateBody(values);
    } else {
      if (!user) return;
      body = changedFields(user, values);
      if (Object.keys(body).length === 0) {
        onClose(); // nothing changed: nothing to send
        return;
      }
    }
    inFlight.current = true;
    setApiError(null);
    save.mutate({ body });
  };

  const onCancel = () => (isDirty ? setDiscardDialogVisible(true) : onClose());

  // Android's back button asks too, like "Cancelar" and the arrow.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancelRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const status: UserFormStatus =
    mode === 'create' || user
      ? 'ready'
      : userQuery.isError
        ? userQuery.error.status === 404
          ? 'notFound'
          : 'error'
        : 'loading';

  return {
    form,
    mode,
    title: mode === 'create' ? 'Novo usuário' : 'Editar usuário',
    status,
    loadErrorMessage: userQuery.error ? loadErrorText(userQuery.error) : '',
    onRetryLoad: () => userQuery.refetch(),
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving: save.isPending,
    apiError,
    isDirty,
    discardDialogVisible,
    onCancel,
    onKeepEditing: () => setDiscardDialogVisible(false),
    onDiscard: () => {
      setDiscardDialogVisible(false);
      onClose();
    },
  };
};
