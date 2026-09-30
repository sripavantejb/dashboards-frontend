import { useAuthStore } from '@/stores/auth';

/** Mirrors the backend rules: `*` grants everything, `resource:*` grants the resource, and write implies read. */
export function hasPermission(permissions: string[] | undefined, required: string): boolean {
  if (!permissions?.length) return false;
  if (permissions.includes('*') || permissions.includes(required)) return true;
  const [resource, action] = required.split(':');
  if (permissions.includes(`${resource}:*`)) return true;
  if (action === 'read' && permissions.includes(`${resource}:write`)) return true;
  return false;
}

export function hasAny(permissions: string[] | undefined, required: string[]): boolean {
  return required.some((r) => hasPermission(permissions, r));
}

export function useCan() {
  const user = useAuthStore((s) => s.user);
  return (required: string | string[]) =>
    user?.role === 'super_admin' || hasAny(user?.permissions, Array.isArray(required) ? required : [required]);
}
