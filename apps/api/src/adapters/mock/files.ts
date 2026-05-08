import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { config } from '../../config.js';

/**
 * Mock files adapter ("Fiload"):
 * - createUploadUrl returns a key + a local PUT URL handled by routes/files.js
 * - createDownloadUrl returns a short-lived public URL (here: same path).
 * @type {import('@provit/shared').FilesAdapter}
 */
export const filesAdapter = {
  async createUploadUrl({ filename, mime, sizeBytes }) {
    const ext = path.extname(filename) || '';
    const key = `${uuid()}${ext}`;
    const uploadUrl = `${config.publicApiUrl}/api/files/raw/${key}`;
    return {
      key,
      uploadUrl,
      headers: { 'content-type': mime, 'x-size': String(sizeBytes) },
    };
  },

  async createDownloadUrl(key) {
    return { url: `${config.publicApiUrl}/api/files/raw/${key}` };
  },
};
