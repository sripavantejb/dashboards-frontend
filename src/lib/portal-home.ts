import { api } from '@/lib/api';
import { PLATFORM_ADMIN_PATH } from '@/lib/admin-routes';
import { bdaBasePath } from '@/lib/bda-path';
import { useAuthStore } from '@/stores/auth';

/** Where to send a user after company login. BDAs go to /{slug}/bda; everyone else ERP dashboard. */
export async function resolvePostLoginPath(role?: string, orgSlug?: string): Promise<string> {
  if (role === 'super_admin') return PLATFORM_ADMIN_PATH;
  const slug = orgSlug || useAuthStore.getState().organization?.slug;
  try {
    const me = await api.data<{ isSalesAdmin: boolean }>('/sales-crm/me');
    if (me && !me.isSalesAdmin) return bdaBasePath(slug);
  } catch {
    // Not provisioned in Sales CRM — stay on agency ERP.
  }
  return '/dashboard';
}
