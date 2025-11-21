/**
 * Policy registry for reusable RBAC policies.
 * Each policy is atomic, composable, and testable.
 */
import { Policy } from './rbac';

export const policies: Record<string, Policy> = {
  /** Only allow if user is owner of resource (id param) */
  isOwner: (user, req) => user.id === req.params.id,
  /** Only allow if user is admin */
  isAdmin: (user) => user.role === 'admin',
  /** Only allow if user can edit chart */
  canEditChart: (user) => user.permissions?.includes('edit_chart') ?? false,
  // Add more as needed
}; 