const { Pool } = require('pg');
const { getSecret } = require('./secrets_manager');

// --- Load DB User/Role from Environment ---
function getDBUser() {
  const user = process.env.DB_USER || 'coinet_app';
  if (!user) throw new Error('DB_USER must be set');
  return user;
}

// --- Create DB Pool with Least Privilege and Secrets Manager ---
async function createDBPool() {
  const password = await getSecret('DB_PASSWORD', process.env.SECRETS_PROVIDER || 'env');
  return new Pool({
    user: getDBUser(),
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'coinet',
    password,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    // No superuser, no unnecessary privileges
    // Use read-only user for analytics, write user for writes
  });
}

// --- Validate DB Permissions (for admin use) ---
async function validateDBPermissions(pool) {
  const { rows } = await pool.query('SELECT current_user, session_user');
  // Optionally: check for superuser or unwanted roles
  if (rows[0].current_user === 'postgres' || rows[0].session_user === 'postgres') {
    throw new Error('Do not use superuser for app connections');
  }
  return rows[0];
}

module.exports = {
  getDBUser,
  createDBPool,
  validateDBPermissions,
}; 