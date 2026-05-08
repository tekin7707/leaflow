import { config } from '../config.js';
import { log } from '../log.js';

import { agentechAuthAdapter, agentechTeamsAdapter } from './http/agentechauth.js';
import { filoadAdapter } from './http/fiload.js';
import { expoPushAdapter } from './http/expoPush.js';

if (!config.agentech.apiKey) {
  log.warn('AGENTECHAUTH_API_KEY is empty — agentechauth calls will fail');
}

export const adapters = {
  auth: agentechAuthAdapter,
  teams: agentechTeamsAdapter,
  files: filoadAdapter,
  push: expoPushAdapter,
};
