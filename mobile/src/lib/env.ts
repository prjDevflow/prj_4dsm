export type Env = {
  apiUrl: string;
  fakeServices: string[];
};

type RawEnv = {
  EXPO_PUBLIC_API_URL?: string;
  EXPO_PUBLIC_FAKE_SERVICES?: string;
};

const API_URL_PATTERN = /^https?:\/\/[^/\s]+(\/[^\s]*)?\/api\/v1$/;

export const parseEnv = (raw: RawEnv): Env => {
  const apiUrl = (raw.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
  if (!apiUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL não definida. Crie o mobile/.env a partir do .env.example.',
    );
  }
  if (!API_URL_PATTERN.test(apiUrl)) {
    throw new Error(
      'EXPO_PUBLIC_API_URL inválida: use http:// ou https:// e termine em /api/v1 (exemplo: http://192.168.0.15:3000/api/v1).',
    );
  }

  const fakeServices = (raw.EXPO_PUBLIC_FAKE_SERVICES ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return { apiUrl, fakeServices };
};

// Expo inlines EXPO_PUBLIC_* only when read as literal `process.env.NAME`.
export const env = parseEnv({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_FAKE_SERVICES: process.env.EXPO_PUBLIC_FAKE_SERVICES,
});
