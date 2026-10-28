import axios, { AxiosError } from 'axios';
import { useSessionStore } from '@/context/SessionStore';
import { env } from '@/lib/env';
import { ApiError, type FieldError } from './ApiError';

type ErrorBody = { error?: { code?: string; message?: string; details?: FieldError[] } };

type AxiosInstanceOptions = {
  baseURL: string;
  timeout?: number;
};

const toApiError = (error: unknown): ApiError => {
  if (!axios.isAxiosError<ErrorBody>(error)) {
    return new ApiError(null, 'NETWORK', 'Sem conexão');
  }
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ApiError(null, 'TIMEOUT', 'Tempo esgotado');
  }
  if (!error.response) {
    return new ApiError(null, 'NETWORK', 'Sem conexão');
  }
  const { status, data } = error.response;
  const body = typeof data === 'object' && data !== null ? data.error : undefined;
  return new ApiError(
    status,
    body?.code ?? 'INTERNAL_ERROR',
    body?.message ?? '',
    body?.details ?? [],
  );
};

export const createAxiosInstance = ({ baseURL, timeout = 10_000 }: AxiosInstanceOptions) => {
  const instance = axios.create({ baseURL, timeout });

  instance.interceptors.request.use((config) => {
    const token = useSessionStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const apiError = toApiError(error);
      // An expired or revoked token ends the session; a 401 without a session is a failed login.
      if (apiError.status === 401 && useSessionStore.getState().token) {
        useSessionStore.getState().expireSession();
      }
      return Promise.reject(apiError);
    },
  );

  return instance;
};

export const AxiosInstance = createAxiosInstance({ baseURL: env.apiUrl });
