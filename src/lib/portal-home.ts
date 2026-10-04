import { api } from '@/lib/api';
import { PLATFORM_ADMIN_PATH } from '@/lib/admin-routes';

/** Where to send a user after company login. BDAs go to /bda; everyone else ERP dashboard. */
export async function resolvePostLoginPath(role?: string): Promise<string> {
  if (role === 'super_admin') return PLATFORM_ADMIN_PATH;
  try {
    const me = await api.data<{ isSalesAdmin: boolean }>('/sales-crm/me');
    if (me && !me.isSalesAdmin) return '/bda';
  } catch {
    // Not provisioned in Sales CRM — stay on agency ERP.
  }
  return '/dashboard';
}
