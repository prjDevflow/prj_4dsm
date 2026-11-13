import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui';
import type { CreateNfcTagBody, TagNfc } from '@/lib/types/nfcTags';
import type { ApiError } from '@/service/ApiError';
import type { ICreateNfcTagService } from '@/service/INfcTagService';
import type { IListUsersService } from '@/service/IUserService';
import { applyFieldErrors } from '@/screens/Shared/form/applyFieldErrors';
import { useDiscardGuard } from '@/screens/Shared/form/useDiscardGuard';
import { personOption, usePeopleQuery } from '../../users/usersQueries';
import { CHOOSE_PERSON_FIRST, tagSaveError } from '../tags.messages';
import { nfcTagsQueryKeys } from '../tagsQueries';
import {
  emptyTagForm,
  tagFormSchema,
  toCreateBody,
  type TagFormOutput,
  type TagFormValues,
} from './tagForm.schema';

type TagFormModelProps = {
  createNfcTagService: ICreateNfcTagService;
  listUsersService: IListUsersService;
  /** Leaves the screen (after saving, or when the person gives up). */
  onClose: () => void;
  /** T30: the terminal reads the tag for this person. */
  onOpenEnroll: (usuarioId: string) => void;
};

// T29 Vincular tag. A repeated tag shows its error on the code field.
export const useTagFormModel = ({
  createNfcTagService,
  listUsersService,
  onClose,
  onOpenEnroll,
}: TagFormModelProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<TagFormValues, unknown, TagFormOutput>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: emptyTagForm,
  });
  const { isDirty } = form.formState;
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);
  // Only active people: the server refuses a tag for an inactive account.
  const people = usePeopleQuery(listUsersService, { onlyActive: true });

  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: () => setApiError(null),
      }),
    [form],
  );

  const save = useMutation<TagNfc, ApiError, CreateNfcTagBody>({
    mutationFn: (body) => createNfcTagService.exec(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: nfcTagsQueryKeys.all });
      toast.show('Tag vinculada.');
      onClose();
    },
    onError: (error) => {
      const { fields, banner } = tagSaveError(error);
      applyFieldErrors(form.setError, fields);
      setApiError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submit = (values: TagFormOutput) => {
    if (inFlight.current) return; // a double tap sends a single request
    inFlight.current = true;
    setApiError(null);
    save.mutate(toCreateBody(values));
  };

  return {
    form,
    personOptions: useMemo(() => (people.data ?? []).map(personOption), [people.data]),
    onSubmit: () => form.handleSubmit(submit)(),
    isSaving: save.isPending,
    apiError,
    onReadOnTerminal: () => {
      const usuarioId = form.getValues('usuarioId');
      if (!usuarioId) {
        form.setError('usuarioId', { type: 'manual', message: CHOOSE_PERSON_FIRST });
        return;
      }
      onOpenEnroll(usuarioId);
    },
    // "Cancelar", the arrow and Android's back button ask before losing changes.
    ...useDiscardGuard(isDirty, onClose),
  };
};
