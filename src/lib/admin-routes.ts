export const DEFAULT_ADMIN_LOGIN_PATH = '/super-admin';

/** Obscure URL for platform super-admin login — not linked from the public UI. */
export const ADMIN_LOGIN_PATH =
  import.meta.env.VITE_ADMIN_LOGIN_PATH || DEFAULT_ADMIN_LOGIN_PATH;
