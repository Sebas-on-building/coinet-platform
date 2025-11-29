// Example: Use a restricted DB user for all connections
export const DB_USER = process.env.DB_USER || 'coinet_app';
export const DB_ROLE = process.env.DB_ROLE || 'readonly';
// Ensure your DB connection string uses these env vars and not a superuser.
// Document in README and enforce in CI/CD if possible. 