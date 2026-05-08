import express from 'express';
import {
  TeamCreateSchema, TeamMemberAddSchema, TeamMemberRoleSchema,
} from '@provit/shared/schemas';
import { prisma } from '../db.js';
import { adapters } from '../adapters/index.js';
import { requireAuth, getFreshUpstreamToken } from '../auth.js';
import { wrap, notFound, badRequest, forbidden, unauthorized } from '../errors.js';

export const teamsRoutes = express.Router();
teamsRoutes.use(requireAuth);

const requireUpstream = async (userId) => {
  const t = await getFreshUpstreamToken(userId);
  if (!t) throw unauthorized('No upstream session — re-login required');
  return t;
};

const buildDisplayName = (u) =>
  u.displayName?.trim() ||
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
  u.email;

async function upsertExternalUser(ext) {
  return prisma.user.upsert({
    where: { externalId: ext.externalId },
    update: {
      email: ext.email,
      displayName: buildDisplayName(ext),
      firstName: ext.firstName ?? null,
      lastName: ext.lastName ?? null,
      avatarUrl: ext.avatarUrl ?? null,
      agentechRole: ext.role ?? null,
    },
    create: {
      externalId: ext.externalId,
      email: ext.email,
      displayName: buildDisplayName(ext),
      firstName: ext.firstName ?? null,
      lastName: ext.lastName ?? null,
      avatarUrl: ext.avatarUrl ?? null,
      agentechRole: ext.role ?? null,
    },
  });
}

async function mirrorTeam(extTeam) {
  const team = await prisma.teamRef.upsert({
    where: { externalId: extTeam.externalId },
    update: { name: extTeam.name, code: extTeam.code },
    create: { externalId: extTeam.externalId, name: extTeam.name, code: extTeam.code },
  });

  for (const m of extTeam.members ?? []) {
    if (!m.user) continue;
    const localUser = await upsertExternalUser(m.user);
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: localUser.id } },
      update: { role: m.role },
      create: { teamId: team.id, userId: localUser.id, role: m.role },
    });
  }
  return team;
}

teamsRoutes.get(
  '/',
  wrap(async (req, res) => {
    const accessToken = await getFreshUpstreamToken(req.user.id);
    let externals = [];
    if (accessToken && adapters.teams.listTeams) {
      try {
        externals = await adapters.teams.listTeams(accessToken);
      } catch (e) {
        if (e.status !== 401 && e.status !== 403) throw e;
      }
    }

    for (const ext of externals) await mirrorTeam(ext);

    const teams = await prisma.teamRef.findMany({
      include: { members: { include: { user: true } } },
      orderBy: { name: 'asc' },
    });

    const externalById = new Map(externals.map((e) => [e.externalId, e]));

    res.json(
      teams.map((t) => {
        const ext = t.externalId ? externalById.get(t.externalId) : null;
        return {
          id: t.id,
          name: t.name,
          code: t.code,
          externalId: t.externalId,
          description: ext?.description ?? null,
          logoPath: ext?.logoPath ?? null,
          membersCount: ext?.membersCount ?? t.members.length,
          adminCount:
            ext?.adminCount ?? t.members.filter((m) => m.role === 'MANAGER').length,
          currentUserRole: ext?.currentUserRole ?? null,
          canManage: ext?.canManage ?? req.isManager,
          members: t.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: {
              id: m.user.id,
              externalId: m.user.externalId,
              email: m.user.email,
              displayName: m.user.displayName,
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              avatarUrl: m.user.avatarUrl,
            },
          })),
        };
      }),
    );
  }),
);

teamsRoutes.get(
  '/:teamId/members',
  wrap(async (req, res) => {
    const team = await prisma.teamRef.findUnique({ where: { id: req.params.teamId } });
    if (!team) throw notFound('Team not found');

    let members = null;
    if (team.externalId && adapters.teams.listMembers) {
      const accessToken = await requireUpstream(req.user.id);
      try {
        members = await adapters.teams.listMembers(team.externalId, accessToken);
      } catch (e) {
        if (e.status === 401 || e.status === 403) throw forbidden('Upstream forbids access');
        throw e;
      }
      // Mirror users + memberships
      for (const m of members) {
        if (!m.user) continue;
        const localUser = await upsertExternalUser(m.user);
        await prisma.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: localUser.id } },
          update: { role: m.role },
          create: { teamId: team.id, userId: localUser.id, role: m.role },
        });
      }
    }

    const local = await prisma.teamMember.findMany({
      where: { teamId: team.id },
      include: { user: true },
      orderBy: { role: 'asc' },
    });
    res.json(
      local.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: {
          id: m.user.id,
          externalId: m.user.externalId,
          email: m.user.email,
          displayName: m.user.displayName,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          avatarUrl: m.user.avatarUrl,
          role: m.user.agentechRole,
        },
      })),
    );
  }),
);

teamsRoutes.get(
  '/:teamId/available-users',
  wrap(async (req, res) => {
    const team = await prisma.teamRef.findUnique({ where: { id: req.params.teamId } });
    if (!team) throw notFound('Team not found');

    if (team.externalId && adapters.teams.availableUsers) {
      const accessToken = await requireUpstream(req.user.id);
      const users = await adapters.teams.availableUsers(team.externalId, accessToken);
      return res.json(users);
    }

    // Fallback: any local user not currently in the team.
    const memberIds = await prisma.teamMember.findMany({
      where: { teamId: team.id },
      select: { userId: true },
    });
    const exclude = new Set(memberIds.map((m) => m.userId));
    const users = await prisma.user.findMany({
      where: { id: { notIn: [...exclude] } },
      take: 50,
    });
    res.json(users);
  }),
);

teamsRoutes.post(
  '/',
  wrap(async (req, res) => {
    const data = TeamCreateSchema.parse(req.body);
    const t = await prisma.teamRef.create({ data });
    res.status(201).json(t);
  }),
);

teamsRoutes.post(
  '/sync/:externalId',
  wrap(async (req, res) => {
    if (!adapters.teams.getTeam) throw badRequest('Sync not supported');
    const accessToken = await getFreshUpstreamToken(req.user.id);
    const ext = await adapters.teams.getTeam(req.params.externalId, accessToken);
    if (!ext) throw notFound('External team not found');
    const team = await mirrorTeam(ext);
    res.json(team);
  }),
);

teamsRoutes.get(
  '/users/search',
  wrap(async (req, res) => {
    const q = String(req.query.q ?? '');
    const accessToken = await getFreshUpstreamToken(req.user.id);
    if (adapters.teams.searchUsers) {
      const users = await adapters.teams.searchUsers(q, accessToken);
      return res.json(users);
    }
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      take: 25,
      orderBy: { displayName: 'asc' },
    });
    res.json(users);
  }),
);

teamsRoutes.post(
  '/:teamId/members',
  wrap(async (req, res) => {
    const { userId, role } = TeamMemberAddSchema.parse(req.body);
    const team = await prisma.teamRef.findUnique({ where: { id: req.params.teamId } });
    if (!team) throw notFound('Team not found');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('User not found');

    const exists = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
    });
    if (exists) throw badRequest('Already a member');

    const m = await prisma.teamMember.create({
      data: { teamId: team.id, userId: user.id, role },
      include: { user: true },
    });
    res.status(201).json(m);
  }),
);

teamsRoutes.delete(
  '/:teamId/members/:userId',
  wrap(async (req, res) => {
    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: req.params.teamId, userId: req.params.userId } },
    });
    res.status(204).end();
  }),
);

teamsRoutes.post(
  '/:teamId/members/:userId/role',
  wrap(async (req, res) => {
    const { role } = TeamMemberRoleSchema.parse(req.body);
    const m = await prisma.teamMember.update({
      where: { teamId_userId: { teamId: req.params.teamId, userId: req.params.userId } },
      data: { role },
    });
    res.json(m);
  }),
);
