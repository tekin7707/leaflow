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

export interface UploadUrlInput {
  filename: string;
  mime: string;
  sizeBytes: number;
}

export interface UploadUrlResult {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface AuthAdapter {
  /** Mock returns ExternalUser only; real returns user + upstream tokens. */
  authenticate(email: string, password: string): Promise<ExternalAuthResult | ExternalUser | null>;
  refresh?(refreshToken: string): Promise<ExternalAuthTokens | null>;
  getProjectProfile?(accessToken: string): Promise<ExternalProjectProfile | null>;
}

export interface TeamsAdapter {
  /** Single team lookup by upstream id (used for sync). */
  getTeam?(externalId: string, accessToken?: string): Promise<ExternalTeam | null>;
  /** List teams visible to the current user. */
  listTeams?(accessToken: string): Promise<ExternalTeam[]>;
  /** List members for a given team. */
  listMembers?(teamId: string, accessToken: string): Promise<ExternalTeam['members']>;
  /** Search users in the project (admin pool). */
  searchUsers(query: string, accessToken?: string): Promise<ExternalUser[]>;
  /** Users in the project pool not yet attached to the team. */
  availableUsers?(teamId: string, accessToken: string): Promise<ExternalUser[]>;
}

export interface FilesAdapter {
  createUploadUrl(input: UploadUrlInput): Promise<UploadUrlResult>;
  createDownloadUrl(key: string): Promise<{ url: string }>;
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
