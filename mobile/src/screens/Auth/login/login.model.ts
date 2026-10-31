import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSessionStore } from '@/context/SessionStore';
import type { LoginResponse } from '@/lib/types/auth';
import type { ApiError } from '@/service/ApiError';
import type { ILoginUserService } from '@/service/IAuthService';
import { loginErrorMessage } from './login.messages';
import {
  SchemaLoginUser,
  type SchemaLoginUserInput,
  type SchemaLoginUserType,
} from './login.schema';

type LoginModelProps = {
  loginUserService: ILoginUserService;
};

export const useLoginModel = ({ loginUserService }: LoginModelProps) => {
  const form = useForm<SchemaLoginUserInput, unknown, SchemaLoginUserType>({
    resolver: zodResolver(SchemaLoginUser),
    defaultValues: { email: '', senha: '' },
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const signIn = useSessionStore((state) => state.signIn);
  const sessionExpired = useSessionStore((state) => state.expired);

  const login = useMutation<LoginResponse, ApiError, SchemaLoginUserType>({
    mutationFn: ({ email, senha }) => loginUserService.exec(email.toLowerCase(), senha),
    // The guards in src/app/_layout.tsx react to the session and open the home of the profile.
    onSuccess: ({ accessToken, usuario }) => signIn(accessToken, usuario),
    onError: (error) => {
      form.setValue('senha', '');
      setApiError(loginErrorMessage(error));
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  // The fields are disabled while sending. On Android the focus command can reach the native field
  // before the "enabled again" prop does, so the focus waits for the next frame.
  useEffect(() => {
    if (!apiError || login.isPending) return;
    const frame = requestAnimationFrame(() => form.setFocus('senha'));
    return () => cancelAnimationFrame(frame);
  }, [apiError, login.isPending, form]);

  // The error strip goes away as soon as the person types again.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ type }) => {
          if (type === 'change') setApiError(null);
        },
      }),
    [form],
  );

  const onSubmit = (data: SchemaLoginUserType) => {
    if (inFlight.current) return; // a double tap sends a single request
    inFlight.current = true;
    setApiError(null);
    login.mutate(data);
  };

  return {
    form,
    onSubmit,
    apiError,
    sessionExpired,
    isSubmitting: login.isPending,
  };
};
