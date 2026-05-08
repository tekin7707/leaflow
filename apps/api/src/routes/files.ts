import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { FileUploadUrlSchema } from '@provit/shared/schemas';
import { config } from '../config.js';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, badRequest } from '../errors.js';

export const filesRoutes = express.Router();

const uploadRoot = path.resolve(process.cwd(), config.uploadDir);
await fs.mkdir(uploadRoot, { recursive: true });

filesRoutes.post(
  '/upload-url',
  requireAuth,
  wrap(async (req, res) => {
    const data = FileUploadUrlSchema.parse(req.body);
    const out = await adapters.files.createUploadUrl(data);
    res.json(out);
  }),
);

filesRoutes.get(
  '/download/:key',
  requireAuth,
  wrap(async (req, res) => {
    const out = await adapters.files.createDownloadUrl(req.params.key);
    res.json(out);
  }),
);

// PUT /api/files/raw/:key — local upload sink (no auth — presigned-style)
filesRoutes.put(
  '/raw/:key',
  express.raw({ type: '*/*', limit: '50mb' }),
  wrap(async (req, res) => {
    const key = req.params.key;
    if (!/^[\w.-]+$/.test(key)) throw badRequest('Invalid key');
    const target = path.join(uploadRoot, key);
    await fs.writeFile(target, req.body);
    res.status(204).end();
  }),
);

// GET /api/files/raw/:key — local download
filesRoutes.get(
  '/raw/:key',
  wrap(async (req, res) => {
    const key = req.params.key;
    if (!/^[\w.-]+$/.test(key)) throw badRequest('Invalid key');
    const target = path.join(uploadRoot, key);
    try {
      await fs.access(target);
    } catch {
      return res.status(404).json({ error: 'not_found' });
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    createReadStream(target).pipe(res);
  }),
);
