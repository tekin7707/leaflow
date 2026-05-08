import 'node:process';

const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 7051),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:7052',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:7051',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
  agentech: {
    baseUrl: process.env.AGENTECHAUTH_BASE_URL || 'https://api.agentechauth.com/api',
    apiKey: process.env.AGENTECHAUTH_API_KEY || 'pk_865b8622f8644c1de83d546e99a924dd',
  },
  fiload: {
    baseUrl: process.env.FILOAD_BASE_URL ?? 'https://fiload.agentechauth.com',
  },
  expo: {
    pushUrl: process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send',
    accessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
  },
};
