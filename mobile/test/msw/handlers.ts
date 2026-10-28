import { http, HttpResponse } from 'msw';

// Same base URL as jest.env.js.
export const API_URL = 'http://api.test/api/v1';

// Default answers: the examples of backend/openapi.yaml.
export const handlers = [
  http.get(`${API_URL}/health`, () =>
    HttpResponse.json({
      status: 'ok',
      version: '0.1.0',
      time: '2026-10-16T12:00:00.000Z',
      db: 'up',
    }),
  ),
];
