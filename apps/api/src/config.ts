import 'node:process';

const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:4000',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
  agentech: {
    baseUrl: process.env.AGENTECHAUTH_BASE_URL ?? 'https://api.agentechauth.com/api',
    apiKey: process.env.AGENTECHAUTH_API_KEY ?? '',
  },
  authMode: process.env.AUTH_MODE ?? (process.env.AGENTECHAUTH_API_KEY ? 'agentech' : 'mock'),
};
