import { prisma } from '../../db.js';

const toExternalUser = (u) => ({
  externalId: u.externalId,
  email: u.email,
  firstName: u.firstName ?? undefined,
  lastName: u.lastName ?? undefined,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl ?? undefined,
  role: u.agentechRole ?? undefined,
});

const toExternalTeam = (t) => ({
  externalId: t.externalId ?? t.id,
  name: t.name,
  code: t.code,
  description: null,
  logoPath: null,
  membersCount: t.members?.length,
  adminCount: (t.members ?? []).filter((m) => m.role === 'MANAGER').length,
  members: (t.members ?? []).map((m) => ({
    membershipId: m.id,
    userId: m.user.externalId,
    role: m.role,
    user: m.user ? toExternalUser(m.user) : undefined,
  })),
});

/**
 * Mock teams adapter: reads from local DB.
 * @type {import('@provit/shared').TeamsAdapter}
 */
export const teamsAdapter = {
  async listTeams(_accessToken) {
    const teams = await prisma.teamRef.findMany({
      include: { members: { include: { user: true } } },
      orderBy: { name: 'asc' },
    });
    return teams.map(toExternalTeam);
  },

  async getTeam(externalId, _accessToken) {
    const t = await prisma.teamRef.findFirst({
      where: { OR: [{ externalId }, { id: externalId }] },
      include: { members: { include: { user: true } } },
    });
    return t ? toExternalTeam(t) : null;
  },

  async listMembers(teamId, _accessToken) {
    const t = await prisma.teamRef.findFirst({
      where: { OR: [{ externalId: teamId }, { id: teamId }] },
      include: { members: { include: { user: true } } },
    });
    if (!t) return [];
    return t.members.map((m) => ({
      membershipId: m.id,
      userId: m.user.externalId,
      role: m.role,
      user: toExternalUser(m.user),
    }));
  },

  async availableUsers(teamId, _accessToken) {
    const t = await prisma.teamRef.findFirst({
      where: { OR: [{ externalId: teamId }, { id: teamId }] },
      include: { members: true },
    });
    const memberUserIds = new Set((t?.members ?? []).map((m) => m.userId));
    const users = await prisma.user.findMany({
      where: { id: { notIn: [...memberUserIds] } },
      take: 50,
    });
    return users.map(toExternalUser);
  },

  async searchUsers(query, _accessToken) {
    const q = (query ?? '').trim();
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
    });
    return users.map(toExternalUser);
  },
};
