import { bdaBasePath } from '@/lib/bda-path';

/** Rewrite ERP `/sales-crm` (or legacy `/bda`) links into the company BDA portal when needed. */
export function portalHref(href: string | undefined, orgSlug?: string | null) {
  if (!href) return '';
  const prefix = bdaBasePath(orgSlug);
  if (href.startsWith('/sales-crm')) return href.replace(/^\/sales-crm/, prefix);
  if (href === '/bda' || href.startsWith('/bda/')) return href.replace(/^\/bda/, prefix);
  // BDA inbox: leave lives under the portal, not the agency ERP shell.
  if (orgSlug && (href === '/leave' || href.startsWith('/leave?'))) {
    return `${prefix}/leave${href.slice('/leave'.length)}`;
  }
  return href;
}

/** Open a lead in the portal hub (BDA drawer or ERP detail). */
export function leadHref(basePath: string, leadId: string) {
  if (!leadId) return `${basePath}/leads`;
  return basePath.includes('/bda') ? `${basePath}/leads?lead=${leadId}` : `${basePath}/leads/${leadId}`;
}

export function leadIdOf(row?: { leadId?: unknown; _id?: string } | null) {
  if (!row) return '';
  const raw = row.leadId;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw && '_id' in raw) return String((raw as { _id: string })._id || '');
  return String(raw);
}
