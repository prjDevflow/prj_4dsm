import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui';
import { loadErrorMessage } from '@/lib/apiMessages';
import { formatDateTime, formatIsoDate } from '@/lib/dateValue';
import { entriesLeft } from '@/lib/entriesLeft';
import { perfilLabel } from '@/lib/perfil';
import type { Autorizacao } from '@/lib/types/authorizations';
import type { Page } from '@/lib/types/page';
import type { ApiError } from '@/service/ApiError';
import type {
  ICancelAuthorizationService,
  IGetAuthorizationService,
} from '@/service/IAuthorizationService';
import { authorizationsQueryKeys } from '../authorizationsQueries';
import {
  cancelFormSchema,
  cancelSaveError,
  type CancelFormOutput,
  type CancelFormValues,
} from './cancelAuthorization';

type AuthorizationDetailModelProps = {
  authorizationId: string;
  getAuthorizationService: IGetAuthorizationService;
  cancelAuthorizationService: ICancelAuthorizationService;
};

/** The texts of T25, from the authorization as the API answers it. */
const toDetails = (authorization: Autorizacao) => {
  const { usuario, local, dataInicio, dataFim, horaInicio, horaFim } = authorization;
  const { usosRealizados, usosPermitidos, usosRestantes, criadoPor, criadoEm } = authorization;
  const { canceladoPor, canceladoEm, motivoCancelamento, situacaoEfetiva } = authorization;

  return {
    pessoa: usuario.nome,
    perfil: perfilLabel(usuario.perfil),
    situacao: situacaoEfetiva,
    local: `${local.nome}, ${local.edificio.nome}`,
    periodo: `${formatIsoDate(dataInicio)} a ${formatIsoDate(dataFim)}`,
    horario: `Das ${horaInicio} às ${horaFim}`,
    usosRealizados,
    usosPermitidos,
    entradas: `${usosRealizados} de ${usosPermitidos} usadas`,
    restantes: `${entriesLeft(usosRestantes)}.`,
    criadaPor: `Criada por ${criadoPor.nome} em ${formatDateTime(criadoEm)}`,
    canceladaPor:
      canceladoPor && canceladoEm
        ? `Cancelada por ${canceladoPor.nome} em ${formatDateTime(canceladoEm)}`
        : null,
    motivo: motivoCancelamento ? `Motivo: ${motivoCancelamento}` : null,
  };
};

const replaceInPages = (data: InfiniteData<Page<Autorizacao>>, saved: Autorizacao) => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    data: page.data.map((authorization) => (authorization.id === saved.id ? saved : authorization)),
  })),
});

// T25: the data of one authorization, who created and cancelled it, and the cancellation.
export const useAuthorizationDetailModel = ({
  authorizationId,
  getAuthorizationService,
  cancelAuthorizationService,
}: AuthorizationDetailModelProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<CancelFormValues, unknown, CancelFormOutput>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: { motivo: '' },
  });
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const query = useQuery<Autorizacao, ApiError>({
    queryKey: authorizationsQueryKeys.detail(authorizationId),
    queryFn: () => getAuthorizationService.exec(authorizationId),
  });
  const authorization = query.data;

  const cancel = useMutation<Autorizacao, ApiError, string | undefined>({
    mutationFn: (motivo) => cancelAuthorizationService.exec(authorizationId, motivo),
    onSuccess: (saved) => {
      queryClient.setQueryData(authorizationsQueryKeys.detail(saved.id), saved);
      // The badge changes at once in every list in memory; the refetch that follows takes it out
      // of the lists it no longer belongs to (the filter "Ativas", for example).
      queryClient.setQueriesData<InfiniteData<Page<Autorizacao>>>(
        { queryKey: authorizationsQueryKeys.lists },
        (data) => data && replaceInPages(data, saved),
      );
      void queryClient.invalidateQueries({ queryKey: authorizationsQueryKeys.lists });
      setCancelDialogVisible(false);
      toast.show('Autorização cancelada.');
    },
    onError: (error) => {
      const { motivo, banner } = cancelSaveError(error);
      if (motivo) form.setError('motivo', { type: 'server', message: motivo });
      setCancelError(banner);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const submitCancel = ({ motivo }: CancelFormOutput) => {
    if (inFlight.current) return; // a double tap sends a single request
    inFlight.current = true;
    setCancelError(null);
    cancel.mutate(motivo || undefined);
  };

  return {
    status: authorization
      ? ('ready' as const)
      : query.isError
        ? query.error.status === 404
          ? ('notFound' as const)
          : ('error' as const)
        : ('loading' as const),
    details: authorization ? toDetails(authorization) : null,
    loadErrorMessage: query.error ? loadErrorMessage(query.error) : '',
    onRetryLoad: () => query.refetch(),
    // The server also cancels expired or used-up ones, but there is nothing left to protect there.
    canCancel: authorization?.situacaoEfetiva === 'ATIVA',
    form,
    cancelDialogVisible,
    cancelError,
    isCancelling: cancel.isPending,
    onRequestCancel: () => {
      form.reset({ motivo: '' });
      setCancelError(null);
      setCancelDialogVisible(true);
    },
    onKeepAuthorization: () => setCancelDialogVisible(false),
    onConfirmCancel: () => form.handleSubmit(submitCancel)(),
  };
};
