import express from 'express';
import { LoginSchema } from '@provit/shared/schemas';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { signToken, requireAuth, getFreshUpstreamToken } from '../auth.js';
import { wrap, unauthorized, badRequest } from '../errors.js';

export const authRoutes = express.Router();

const RefreshSchema = z.object({ refreshToken: z.string().min(1) });

const buildDisplayName = (u) =>
  u.displayName?.trim() ||
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
  u.email;

async function upsertFromExternal(ext, tokens) {
  const expiresAt = tokens?.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000)
    : null;

  return prisma.user.upsert({
    where: { externalId: ext.externalId },
    update: {
      email: ext.email,
      displayName: buildDisplayName(ext),
      firstName: ext.firstName ?? null,
      lastName: ext.lastName ?? null,
      avatarUrl: ext.avatarUrl ?? null,
      agentechRole: ext.role ?? null,
      ...(tokens && {
        agentechAccessToken: tokens.accessToken,
        agentechRefreshToken: tokens.refreshToken,
        agentechTokenExpiresAt: expiresAt,
      }),
    },
    create: {
      externalId: ext.externalId,
      email: ext.email,
      displayName: buildDisplayName(ext),
      firstName: ext.firstName ?? null,
      lastName: ext.lastName ?? null,
      avatarUrl: ext.avatarUrl ?? null,
      agentechRole: ext.role ?? null,
      ...(tokens && {
        agentechAccessToken: tokens.accessToken,
        agentechRefreshToken: tokens.refreshToken,
        agentechTokenExpiresAt: expiresAt,
      }),
    },
    include: { memberships: { include: { team: true } } },
  });
}

const projectMembershipsView = (user) =>
  user.memberships.map((m) => ({
    teamId: m.teamId,
    teamName: m.team.name,
    teamCode: m.team.code,
    role: m.role,
  }));

authRoutes.post(
  '/login',
  wrap(async (req, res) => {
    const { email, password } = LoginSchema.parse(req.body);
    const result = await adapters.auth.authenticate(email, password);
    if (!result) throw unauthorized('Invalid credentials');

    // Adapter may return ExternalAuthResult OR ExternalUser (legacy).
    const ext = 'user' in result ? result.user : result;
    const tokens = 'tokens' in result ? result.tokens : null;

    const user = await upsertFromExternal(ext, tokens);

    res.json({
      token: signToken(user.id),
      user: {
        id: user.id,
        externalId: user.externalId,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.agentechRole,
        memberships: projectMembershipsView(user),
      },
      upstream: tokens
        ? {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          }
        : null,
    });
  }),
);

authRoutes.post(
  '/refresh',
  wrap(async (req, res) => {
    const { refreshToken } = RefreshSchema.parse(req.body);
    if (!adapters.auth.refresh) throw badRequest('Refresh not supported');
    const tokens = await adapters.auth.refresh(refreshToken);
    if (!tokens) throw unauthorized('Invalid refresh token');

    // Best-effort: update the user row by matching the stored refresh token.
    await prisma.user.updateMany({
      where: { agentechRefreshToken: refreshToken },
      data: {
        agentechAccessToken: tokens.accessToken,
        agentechRefreshToken: tokens.refreshToken,
        agentechTokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
      },
    });

    res.json({ tokens });
  }),
);

authRoutes.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const u = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { memberships: { include: { team: true } } },
    });
    res.json({
      id: u.id,
      externalId: u.externalId,
      email: u.email,
      displayName: u.displayName,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      role: u.agentechRole,
      memberships: projectMembershipsView(u),
    });
  }),
);

authRoutes.get(
  '/profile',
  requireAuth,
  wrap(async (req, res) => {
    const accessToken = await getFreshUpstreamToken(req.user.id);
    if (!accessToken) throw unauthorized('No upstream session');
    const profile = await adapters.auth.getProjectProfile(accessToken);
    res.json(profile);
  }),
);

authRoutes.post(
  '/logout',
  requireAuth,
  wrap(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (u?.agentechRefreshToken && adapters.auth.logout) {
      await adapters.auth.logout(u.agentechRefreshToken, u.agentechAccessToken ?? undefined);
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        agentechAccessToken: null,
        agentechRefreshToken: null,
        agentechTokenExpiresAt: null,
        pushToken: null,
      },
    });
    res.json({ ok: true });
  }),
);
