import express, { type Router } from 'express';

export interface AppOptions {
  isProduction?: boolean;
  extraRoutes?: (router: Router) => void;
}

export function createApp(_options: AppOptions = {}) {
  return express();
}

export const app = createApp();
