/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and scoping logic for the Ad Spy System.
 */

export type Role = 'admin' | 'media_buyer' | 'analyst';

export type Permission = 
  | 'connect_accounts' 
  | 'view_data' 
  | 'execute_actions';

export interface RoleDefinition {
  permissions: Permission[];
}

export const ROLES: Record<Role, RoleDefinition> = {
  admin: {
    permissions: ['connect_accounts', 'view_data', 'execute_actions']
  },
  media_buyer: {
    permissions: ['view_data', 'execute_actions']
  },
  analyst: {
    permissions: ['view_data']
  }
};

/**
 * Checks if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const roleDef = ROLES[role];
  if (!roleDef) return false;
  return roleDef.permissions.includes(permission);
}

/**
 * Workspace Membership structure for Firestore
 */
export interface WorkspaceMember {
  userId: string;
  role: Role;
  addedAt: Date;
}
