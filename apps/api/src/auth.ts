import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { prisma } from './db.js';
import { adapters } from './adapters/index.js';
import { unauthorized } from './errors.js';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());
  const payload = verifyToken(token);
  if (!payload?.sub) return next(unauthorized());

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { memberships: true },
  });
  if (!user) return next(unauthorized());

  req.user = user;
  req.isManager = user.memberships.some((m) => m.role === 'MANAGER') || user.agentechRole === 'admin';
  next();
}

/**
 * Returns a non-expired upstream (Agentechauth) accessToken for a given user.
 * Refreshes via the auth adapter when the stored token is expired or about to
 * expire (60s buffer). Returns null if no token is available.
 */
export async function getFreshUpstreamToken(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.agentechAccessToken) return null;

  const now = Date.now();
  const exp = u.agentechTokenExpiresAt?.getTime() ?? 0;
  const stillFresh = exp - now > 60_000;
  if (stillFresh) return u.agentechAccessToken;

  if (!u.agentechRefreshToken || !adapters.auth.refresh) return u.agentechAccessToken;
  const tokens = await adapters.auth.refresh(u.agentechRefreshToken);
  if (!tokens) return null;

  const expiresAt = tokens.expiresIn ? new Date(now + tokens.expiresIn * 1000) : null;
  await prisma.user.update({
    where: { id: u.id },
    data: {
      agentechAccessToken: tokens.accessToken,
      agentechRefreshToken: tokens.refreshToken ?? u.agentechRefreshToken,
      agentechTokenExpiresAt: expiresAt,
    },
  });
  return tokens.accessToken;
}
