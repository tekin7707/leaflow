import { config } from '../../config.js';
import { log } from '../../log.js';

/**
 * Agentechauth HTTP client. Every request carries the project x-api-key.
 * Authenticated calls also include the user's Bearer access token.
 */
async function call(path, { method = 'GET', body, accessToken } = {}) {
  const url = `${config.agentech.baseUrl}${path}`;
  const headers = {
    'x-api-key': config.agentech.apiKey,
    Accept: 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok || (payload && payload.success === false)) {
    log.warn({ path, status: res.status, payload }, 'agentech:error');
    const err = new Error(payload?.message ?? `Agentechauth ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload?.data ?? payload;
}

const toExternalUser = (u) => ({
  externalId: u.id,
  email: u.email,
  firstName: u.firstName ?? undefined,
  lastName: u.lastName ?? undefined,
  displayName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email,
  avatarUrl: u.avatar ?? undefined,
  role: u.role ?? undefined,
});

const toExternalTeam = (t) => ({
  externalId: t.id,
  name: t.name,
  code: t.slug ?? t.id,
  description: t.description ?? null,
  logoPath: t.logo?.path ?? null,
  membersCount: t.membersCount,
  adminCount: t.adminCount,
  currentUserRole: t.currentUserRole ?? null,
  canManage: t.canManage,
  members: (t.memberships ?? []).map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    role: m.role === 'admin' ? 'MANAGER' : 'MEMBER',
    user: m.user ? toExternalUser(m.user) : undefined,
  })),
});

export const agentechAuthAdapter = {
  async authenticate(email, password) {
    try {
      const data = await call('/auth/login', { method: 'POST', body: { email, password } });
      return {
        user: toExternalUser(data.user),
        tokens: {
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          expiresIn: data.tokens.expiresIn,
        },
      };
    } catch (e) {
      if (e.status === 401 || e.status === 400) return null;
      throw e;
    }
  },

  async refresh(refreshToken) {
    try {
      const data = await call('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
      });
      return {
        accessToken: data.accessToken ?? data.tokens?.accessToken,
        refreshToken: data.refreshToken ?? data.tokens?.refreshToken ?? refreshToken,
        expiresIn: data.expiresIn ?? data.tokens?.expiresIn ?? 900,
      };
    } catch (e) {
      if (e.status === 401) return null;
      throw e;
    }
  },

  async getProjectProfile(accessToken) {
    const data = await call('/projects/me', { accessToken });
    return {
      project: {
        id: data.project.id,
        name: data.project.name,
        slug: data.project.slug,
        description: data.project.description ?? null,
      },
      stats: data.stats,
    };
  },
};

export const agentechTeamsAdapter = {
  async listTeams(accessToken) {
    const data = await call('/teams', { accessToken });
    return (data ?? []).map(toExternalTeam);
  },

  async getTeam(teamId, accessToken) {
    const list = await this.listTeams(accessToken);
    return list.find((t) => t.externalId === teamId) ?? null;
  },

  async listMembers(teamId, accessToken) {
    const data = await call(`/teams/${teamId}/members`, { accessToken });
    return (data ?? []).map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      role: m.role === 'admin' ? 'MANAGER' : 'MEMBER',
      user: m.user ? toExternalUser(m.user) : undefined,
    }));
  },

  async availableUsers(teamId, accessToken) {
    const data = await call(`/teams/${teamId}/available-users`, { accessToken });
    return (data ?? []).map(toExternalUser);
  },

  async searchUsers(_query, accessToken) {
    if (!accessToken) return [];
    const data = await call('/projects/me/users', { accessToken });
    return (data ?? []).map(toExternalUser);
  },
};
