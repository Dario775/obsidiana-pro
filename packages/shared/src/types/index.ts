export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  createdAt: string;
}

export interface UserRole {
  tenantId: string;
  userId: string;
  role: 'admin' | 'manager' | 'cashier' | 'viewer';
}
