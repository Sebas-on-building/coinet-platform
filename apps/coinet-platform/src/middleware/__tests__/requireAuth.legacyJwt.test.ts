/**
 * ─────────────────────────────────────────────────────────────────────────────
 * requireAuth — Legacy JWT path unit tests
 *
 * Covers every security-relevant branch of validateLegacyJWT:
 *   ✓ Valid HS256 token → authenticated
 *   ✓ Invalid signature (forged) → rejected
 *   ✓ Expired token → rejected
 *   ✓ Algorithm "none" → rejected
 *   ✓ JWT_SECRET absent → legacy path skipped entirely
 *   ✓ JWT_SECRET too short → legacy path disabled at startup
 *   ✓ Malformed token (not 3 parts) → rejected
 *   ✓ Missing identity claim → rejected
 *   ✓ role / tier constrained to allow-list
 *   ✓ sub / userId / id variants all accepted as identity
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_SECRET = 'a-valid-secret-that-is-at-least-32-chars-long!!';
const OTHER_SECRET = 'another-secret-that-is-at-least-32-chars-long!!';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sign(
  payload: Record<string, unknown>,
  secret: string = VALID_SECRET,
  options: jwt.SignOptions = {}
): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', ...options });
}

function makeReq(token?: string): Record<string, unknown> {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ip: '127.0.0.1',
    path: '/test',
  };
}

// ── Dynamic import so we can control env vars per test ────────────────────────

async function loadMiddleware(jwtSecret: string | undefined) {
  vi.resetModules();
  if (jwtSecret !== undefined) {
    process.env.JWT_SECRET = jwtSecret;
  } else {
    delete process.env.JWT_SECRET;
  }
  // CLERK_SECRET_KEY must be absent so Clerk path is a no-op
  delete process.env.CLERK_SECRET_KEY;
  process.env.AUTH_ENFORCE_CHAT = 'true';
  process.env.NODE_ENV = 'test';

  const mod = await import('../requireAuth');
  return mod;
}

function makeExpressObjects() {
  const req: any = { headers: {}, ip: '127.0.0.1', path: '/test' };
  const res: any = {
    _status: 0,
    _body: {},
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
  };
  const next = vi.fn();
  return { req, res, next };
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('requireAuth — legacy JWT path', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.JWT_SECRET;
    delete process.env.CLERK_SECRET_KEY;
  });

  // ─── 1. Valid token ─────────────────────────────────────────────────────────
  it('authenticates a valid HS256 token (sub claim)', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const token = sign({ sub: 'user-abc', email: 'alice@coinet.ai', role: 'admin', tier: 'pro' });
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { next(); resolve(); });
    });

    expect(next).toHaveBeenCalled();
    expect(req.isAuthenticated).toBe(true);
    expect(req.authMethod).toBe('legacy');
    expect(req.user?.id).toBe('user-abc');
    expect(req.user?.email).toBe('alice@coinet.ai');
    expect(req.user?.role).toBe('admin');
    expect(req.user?.tier).toBe('pro');
  });

  it('accepts userId claim (api-gateway format)', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const token = sign({ userId: 'user-gw' });
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { next(); resolve(); });
    });

    expect(next).toHaveBeenCalled();
    expect(req.user?.id).toBe('user-gw');
  });

  it('accepts id claim (legacy user-service format)', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const token = sign({ id: 'user-legacy' });
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { next(); resolve(); });
    });

    expect(next).toHaveBeenCalled();
    expect(req.user?.id).toBe('user-legacy');
  });

  // ─── 2. Forged / wrong-secret token ─────────────────────────────────────────
  it('rejects a token signed with a different secret (forged)', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const forged = sign({ sub: 'attacker' }, OTHER_SECRET);
    req.headers.authorization = `Bearer ${forged}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      // wait for async middleware to call res.json
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 3. Expired token ───────────────────────────────────────────────────────
  it('rejects an expired token', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    // exp: 1 hour ago — explicitly expired
    const expired = sign(
      { sub: 'user-exp', exp: Math.floor(Date.now() / 1000) - 3600 },
      VALID_SECRET
    );
    req.headers.authorization = `Bearer ${expired}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 4. Algorithm "none" ────────────────────────────────────────────────────
  it('rejects a token with alg=none', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    // Build an alg:none token manually (jsonwebtoken won't sign with none)
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url');
    const noneToken = `${header}.${payload}.`;
    req.headers.authorization = `Bearer ${noneToken}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 5. JWT_SECRET absent — legacy path skipped ─────────────────────────────
  it('skips legacy JWT entirely when JWT_SECRET is not set', async () => {
    const { requireAuth } = await loadMiddleware(undefined);
    const { req, res, next } = makeExpressObjects();

    // Token is valid HS256 — but the server doesn't have the secret loaded
    const token = sign({ sub: 'user-abc' }, VALID_SECRET);
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 6. JWT_SECRET too short — misconfiguration ────────────────────────────
  it('disables legacy JWT when JWT_SECRET is too short (< 32 chars)', async () => {
    // getJwtSecret should throw at startup and LEGACY_JWT_SECRET stays null
    const { requireAuth } = await loadMiddleware('tooshort');
    const { req, res, next } = makeExpressObjects();

    // sign with that short secret — should still be rejected
    const token = jwt.sign({ sub: 'user-abc' }, 'tooshort', { algorithm: 'HS256' });
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 7. Malformed token ─────────────────────────────────────────────────────
  it('rejects a malformed token (not 3 JWT parts)', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    req.headers.authorization = 'Bearer not.a.valid.jwt.structure';

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 8. Missing identity claim ──────────────────────────────────────────────
  it('rejects a token with no sub / userId / id', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const token = sign({ email: 'noname@coinet.ai' }); // no identity
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { resolve(); });
      setTimeout(resolve, 200);
    });

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // ─── 9. role / tier allow-list ──────────────────────────────────────────────
  it('defaults unknown role to "user" and unknown tier to "free"', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const token = sign({ sub: 'user-xyz', role: 'superadmin', tier: 'diamond' });
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { next(); resolve(); });
    });

    expect(next).toHaveBeenCalled();
    expect(req.user?.role).toBe('user');
    expect(req.user?.tier).toBe('free');
  });

  // ─── 10. name / email must be strings ───────────────────────────────────────
  it('drops non-string name and email claims', async () => {
    const { requireAuth } = await loadMiddleware(VALID_SECRET);
    const { req, res, next } = makeExpressObjects();

    const token = sign({ sub: 'user-xyz', email: 12345, name: ['array'] });
    req.headers.authorization = `Bearer ${token}`;

    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => { next(); resolve(); });
    });

    expect(next).toHaveBeenCalled();
    expect(req.user?.email).toBeUndefined();
    expect(req.user?.name).toBeUndefined();
  });
});

// ── getJwtSecret unit tests ───────────────────────────────────────────────────

describe('getJwtSecret', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.JWT_SECRET;
  });

  it('returns null when JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    const { getJwtSecret } = await import('../../utils/getJwtSecret');
    expect(getJwtSecret()).toBeNull();
  });

  it('returns the secret when it is ≥32 chars', async () => {
    process.env.JWT_SECRET = VALID_SECRET;
    const { getJwtSecret } = await import('../../utils/getJwtSecret');
    expect(getJwtSecret()).toBe(VALID_SECRET);
  });

  it('throws when JWT_SECRET is set but < 32 chars', async () => {
    process.env.JWT_SECRET = 'tooshort';
    const { getJwtSecret } = await import('../../utils/getJwtSecret');
    expect(() => getJwtSecret()).toThrow(/too short/);
  });
});
