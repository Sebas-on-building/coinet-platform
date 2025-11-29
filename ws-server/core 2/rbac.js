const RBAC_MATRIX = {
  admin: ['*'],
  user: ['market:read', 'portfolio:read', 'plugin:execute'],
  guest: ['market:read']
};
function handleRBAC(ws) {
  ws.hasPermission = perm => {
    if (!ws.user) return false;
    if (ws.user.roles.includes('admin')) return true;
    return ws.user.permissions?.includes(perm) || RBAC_MATRIX[ws.user.roles[0]]?.includes(perm);
  };
}
module.exports = { handleRBAC }; 