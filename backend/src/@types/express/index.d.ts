declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Set by the `authenticate` middleware on user (JWT) routes. */
      auth?: { userId: string; perfil: import('../../entities/User').UserProfile };
    }
  }
}

export {};
