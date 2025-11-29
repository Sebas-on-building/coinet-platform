// --- Role-Based Access Control (RBAC) Utility for Coinet ---
// Modular, extensible, and world-class. Each feature is grouped and commented for clarity.

// --- Define Roles, Permissions, and Resources ---
const roles = {
  admin: {
    can: ['*'], // All permissions
  },
  analyst: {
    can: [
      'read:analytics',
      'read:portfolio',
      'read:market',
      'create:alert',
      'read:alert',
    ],
  },
  user: {
    can: [
      'read:portfolio',
      'read:market',
      'create:alert',
      'read:alert',
    ],
  },
  guest: {
    can: ['read:market'],
  },
};

// --- Fine-Grained Permission Check ---
function can(role, action, resource) {
  if (!roles[role]) return false;
  const perms = roles[role].can;
  if (perms.includes('*')) return true;
  if (perms.includes(`${action}:${resource}`)) return true;
  return false;
}

// --- Middleware for Express/GraphQL ---
function requirePermission(action, resource) {
  return (req, res, next) => {
    const user = req.user || req.session?.user;
    const role = user?.role || 'guest';
    if (!can(role, action, resource)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// --- Custom Rule Support (ABAC, group, etc) ---
function canWithCustomRules(user, action, resource, context = {}) {
  // Example: ABAC, group, or org-based rules
  if (user.isSuperuser) return true;
  if (can(user.role, action, resource)) return true;
  // Example: allow if user owns the resource
  if (context.ownerId && user.id === context.ownerId) return true;
  // Example: allow if user is in allowed group
  if (context.allowedGroups && user.groups && user.groups.some(g => context.allowedGroups.includes(g))) return true;
  return false;
}

module.exports = {
  can,
  requirePermission,
  canWithCustomRules,
  roles,
}; 