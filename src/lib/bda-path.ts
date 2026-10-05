/** Company-scoped BDA portal base, e.g. `/editco/bda`. */
export function bdaBasePath(orgSlug?: string | null) {
  const slug = (orgSlug || '').trim().toLowerCase();
  return slug ? `/${slug}/bda` : '/bda';
}

export function isBdaPortalPath(pathname: string) {
  return pathname === '/bda' || pathname.startsWith('/bda/') || /\/bda(\/|$)/.test(pathname);
}

export { portalHref, leadHref, leadIdOf } from '@/lib/portal-href';
