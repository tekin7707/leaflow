import { config } from '../config.js';
import { log } from '../log.js';

import { authAdapter as mockAuth } from './mock/auth.js';
import { teamsAdapter as mockTeams } from './mock/teams.js';
import { filesAdapter } from './mock/files.js';
import { pushAdapter } from './mock/push.js';

import { agentechAuthAdapter, agentechTeamsAdapter } from './http/agentechauth.js';

const useAgentech = config.authMode === 'agentech';
if (useAgentech && !config.agentech.apiKey) {
  log.warn('AUTH_MODE=agentech but AGENTECHAUTH_API_KEY is empty — calls will fail');
}

export const adapters = {
  auth: useAgentech ? agentechAuthAdapter : mockAuth,
  teams: useAgentech ? agentechTeamsAdapter : mockTeams,
  files: filesAdapter,
  push: pushAdapter,
};

export const isAgentech = useAgentech;
