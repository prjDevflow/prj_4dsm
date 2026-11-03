import { ErrorState, LoadingState } from '@/components/ui';

type FormLoadStateProps = {
  status: 'loading' | 'error' | 'notFound';
  /** "Carregando edifício…" */
  loadingLabel: string;
  /** "Edifício não encontrado." */
  notFoundTitle: string;
  notFoundMessage?: string;
  /** "Não foi possível carregar o edifício." */
  errorTitle: string;
  errorMessage: string;
  onRetry: () => unknown;
  onBack: () => void;
};

/** What an edit form shows while the record loads, when it no longer exists or when it fails. */
export const FormLoadState = ({
  status,
  loadingLabel,
  notFoundTitle,
  notFoundMessage = 'Ele pode ter sido removido. Volte para a lista e confira.',
  errorTitle,
  errorMessage,
  onRetry,
  onBack,
}: FormLoadStateProps) =>
  status === 'loading' ? (
    <LoadingState label={loadingLabel} />
  ) : status === 'notFound' ? (
    <ErrorState
      title={notFoundTitle}
      message={notFoundMessage}
      icon="search_off"
      tone="neutro"
      retryLabel="Voltar para a lista"
      onRetry={onBack}
    />
  ) : (
    <ErrorState title={errorTitle} message={errorMessage} onRetry={onRetry} />
  );
