/**
 * spec-01 dış servis eşlemeleri:
 *   Agentechauth → AuthAdapter + TeamsAdapter
 *   Notifit      → PushAdapter
 *   Fiload       → FilesAdapter
 */

export interface ExternalUser {
  externalId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: string;
}

export interface ExternalAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ExternalAuthResult {
  user: ExternalUser;
  tokens: ExternalAuthTokens;
}

export interface ExternalTeam {
  externalId: string;
  name: string;
  code: string;
  description?: string | null;
  logoPath?: string | null;
  membersCount?: number;
  adminCount?: number;
  currentUserRole?: 'admin' | 'member' | null;
  canManage?: boolean;
  members: Array<{
    membershipId?: string;
    userId: string;
    role: 'MANAGER' | 'MEMBER';
    user?: ExternalUser;
  }>;
}

export interface ExternalProjectProfile {
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  };
  stats?: { userCount: number; adminCount: number };
}

export interface AuthAdapter {
  authenticate(email: string, password: string): Promise<ExternalAuthResult | null>;
  refresh(refreshToken: string): Promise<ExternalAuthTokens | null>;
  getProjectProfile?(accessToken: string): Promise<ExternalProjectProfile | null>;
  logout?(refreshToken: string, accessToken?: string): Promise<void>;
}

export interface TeamsAdapter {
  getTeam(externalId: string, accessToken?: string): Promise<ExternalTeam | null>;
  listTeams(accessToken: string): Promise<ExternalTeam[]>;
  listMembers(teamId: string, accessToken: string): Promise<ExternalTeam['members']>;
  searchUsers(query: string, accessToken?: string): Promise<ExternalUser[]>;
  availableUsers(teamId: string, accessToken: string): Promise<ExternalUser[]>;
  createTeam(
    input: { name: string; slug: string; description?: string; logo?: { path: string; originalFileName?: string; mimeType?: string } },
    accessToken: string,
  ): Promise<ExternalTeam>;
  addMember(
    teamId: string,
    input: { userId?: string; email?: string; role: 'MANAGER' | 'MEMBER' },
    accessToken: string,
  ): Promise<unknown>;
  removeMember(teamId: string, userId: string, accessToken: string): Promise<unknown>;
  setMemberRole(
    teamId: string,
    userId: string,
    role: 'MANAGER' | 'MEMBER',
    accessToken: string,
  ): Promise<unknown>;
}

/**
 * Fiload adapter — the actual file bytes go directly between the client and
 * Fiload's public endpoints. Our API only needs the URL builders and the
 * upload endpoint coordinates so clients can be told where to POST.
 */
export interface FilesAdapter {
  uploadEndpoint(): string;
  uploadBase64Endpoint(): string;
  downloadUrl(path: string): string | null;
  previewUrl(path: string): string | null;
  health(): Promise<boolean>;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushAdapter {
  sendToUser(userId: string, payload: PushPayload): Promise<void>;
}

export const ADAPTER_NAMES = {
  auth: 'auth',
  teams: 'teams',
  files: 'files',
  push: 'push',
} as const;
