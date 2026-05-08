import express from 'express';
import { adapters } from '../adapters/index.js';
import { requireAuth } from '../auth.js';
import { wrap, badRequest } from '../errors.js';

export const filesRoutes = express.Router();

/**
 * Returns Fiload coordinates the client uses for direct upload.
 * Mobile/web POST multipart to {uploadUrl}, then send back { path } as a proof.
 */
filesRoutes.get(
  '/config',
  requireAuth,
  wrap(async (_req, res) => {
    res.json({
      uploadUrl: adapters.files.uploadEndpoint(),
      uploadBase64Url: adapters.files.uploadBase64Endpoint(),
    });
  }),
);

/** Build a public Fiload download URL for a stored path. */
filesRoutes.get(
  '/download',
  requireAuth,
  wrap(async (req, res) => {
    const path = String(req.query.path ?? '');
    if (!path) throw badRequest('path is required');
    res.json({ url: adapters.files.downloadUrl(path) });
  }),
);

/** Build a public Fiload preview URL for a stored path. */
filesRoutes.get(
  '/preview',
  requireAuth,
  wrap(async (req, res) => {
    const path = String(req.query.path ?? '');
    if (!path) throw badRequest('path is required');
    res.json({ url: adapters.files.previewUrl(path) });
  }),
);

/**
 * Streams a Fiload-stored file as binary so it can be used directly as an
 * <img src>. Fiload's /gt returns base64 text; we decode it once here.
 * Accepts either ?path= or ?filename= for backwards compatibility — both
 * carry the value returned by /upld.
 */
filesRoutes.get(
  '/raw',
  wrap(async (req, res) => {
    const filename = String(req.query.filename ?? req.query.path ?? '');
    if (!filename) throw badRequest('filename is required');
    const mime = String(req.query.mime ?? 'application/octet-stream');
    const b64 = await adapters.files.downloadBase64(filename);
    if (!b64) return res.status(404).end();
    const buf = Buffer.from(b64, 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buf);
  }),
);
