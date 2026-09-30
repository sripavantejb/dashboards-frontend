export const PLATFORM_ADMIN_PATH = '/platform-admin';
export const DEFAULT_ADMIN_LOGIN_PATH = `${PLATFORM_ADMIN_PATH}/login`;

/** Platform super-admin login — not linked from the public UI. Override with VITE_ADMIN_LOGIN_PATH. */
export const ADMIN_LOGIN_PATH =
  import.meta.env.VITE_ADMIN_LOGIN_PATH || DEFAULT_ADMIN_LOGIN_PATH;

/** `adminPath('organizations', id)` → `/platform-admin/organizations/<id>` */
export const adminPath = (...segments: string[]) => [PLATFORM_ADMIN_PATH, ...segments].join('/');
