import { getSecret } from '../../services/secrets';

let cachedSecret = '';
let lastFetched = 0;
const ROTATE_INTERVAL = 1000 * 60 * 60 * 24; // 24 hours

export async function getJwtSecret() {
  const now = Date.now();
  if (!cachedSecret || now - lastFetched > ROTATE_INTERVAL) {
    cachedSecret = await getSecret('jwt', 'secret');
    lastFetched = now;
  }
  return cachedSecret;
}
// Usage: const secret = await getJwtSecret(); 