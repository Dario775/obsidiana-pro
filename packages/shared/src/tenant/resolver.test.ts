import { describe, expect, it } from 'vitest';
import { getTenantIdFromRequest } from './resolver';

describe('getTenantIdFromRequest', () => {
  it('prefers tenantId from query params', () => {
    const req = new Request('https://app.obsidiana.test/dashboard?tenantId=query-tenant', {
      headers: {
        'x-tenant-id': 'header-tenant',
      },
    });

    expect(getTenantIdFromRequest(req)).toBe('query-tenant');
  });

  it('falls back to x-tenant-id header', () => {
    const req = new Request('https://app.obsidiana.test/dashboard', {
      headers: {
        'x-tenant-id': 'header-tenant',
      },
    });

    expect(getTenantIdFromRequest(req)).toBe('header-tenant');
  });

  it('returns null when no tenant context is present', () => {
    const req = new Request('https://app.obsidiana.test/dashboard');

    expect(getTenantIdFromRequest(req)).toBeNull();
  });
});
