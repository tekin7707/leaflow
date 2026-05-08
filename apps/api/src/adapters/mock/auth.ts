import { prisma } from '../../db.js';

/**
 * Mock auth: looks up the user by email in the seeded DB.
 * Any password is accepted. Returns ExternalAuthResult shape on success.
 * @type {import('@provit/shared').AuthAdapter}
 */
export const authAdapter = {
  async authenticate(email, _password) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return {
      user: {
        externalId: u.externalId,
        email: u.email,
        displayName: u.displayName,
        firstName: u.firstName ?? undefined,
        lastName: u.lastName ?? undefined,
        avatarUrl: u.avatarUrl ?? undefined,
        role: u.agentechRole ?? undefined,
      },
      tokens: {
        accessToken: `mock-access-${u.id}`,
        refreshToken: `mock-refresh-${u.id}`,
        expiresIn: 24 * 60 * 60,
      },
    };
  },

  async refresh(refreshToken) {
    if (!refreshToken?.startsWith('mock-refresh-')) return null;
    return {
      accessToken: refreshToken.replace('mock-refresh-', 'mock-access-'),
      refreshToken,
      expiresIn: 24 * 60 * 60,
    };
  },

  async getProjectProfile(_accessToken) {
    return {
      project: {
        id: 'mock-project',
        name: 'Provit Mock Project',
        slug: 'provit-mock',
        description: 'Local mock project',
      },
      stats: { userCount: await prisma.user.count(), adminCount: 1 },
    };
  },
};
