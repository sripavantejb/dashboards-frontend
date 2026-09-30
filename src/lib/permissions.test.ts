import { describe, expect, it } from 'vitest';
import { hasAny, hasPermission } from './permissions';

describe('hasPermission', () => {
  it('denies when there are no permissions', () => {
    expect(hasPermission(undefined, 'leads:read')).toBe(false);
    expect(hasPermission([], 'leads:read')).toBe(false);
  });

  it('grants exact matches and the global wildcard', () => {
    expect(hasPermission(['leads:read'], 'leads:read')).toBe(true);
    expect(hasPermission(['*'], 'invoices:write')).toBe(true);
  });

  it('grants a whole resource with resource:*', () => {
    expect(hasPermission(['invoices:*'], 'invoices:write')).toBe(true);
    expect(hasPermission(['invoices:*'], 'payments:read')).toBe(false);
  });

  it('lets write imply read but not the reverse', () => {
    expect(hasPermission(['leads:write'], 'leads:read')).toBe(true);
    expect(hasPermission(['leads:read'], 'leads:write')).toBe(false);
  });
});

describe('hasAny', () => {
  it('grants when any requirement is met', () => {
    expect(hasAny(['tasks:read'], ['invoices:read', 'tasks:read'])).toBe(true);
    expect(hasAny(['tasks:read'], ['invoices:read', 'payments:read'])).toBe(false);
    expect(hasAny(['tasks:read'], [])).toBe(false);
  });
});
