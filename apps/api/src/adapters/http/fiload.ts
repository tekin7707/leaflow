import { config } from '../../config.js';
import { log } from '../../log.js';

/**
 * Fiload adapter. Real-world Fiload responses are plain text (not JSON):
 *   - POST /upld   → body is the stored path/filename, e.g. "2026-05/abc.jpg"
 *   - GET  /gt?filename=<path> → body is a base64-encoded string of the file
 *
 * Note: the query param is `filename` (which actually carries the full path
 * returned by /upld) — not `path`.
 */
export const filoadAdapter = {
  uploadEndpoint() {
    return `${config.fiload.baseUrl}/upld`;
  },

  uploadBase64Endpoint() {
    return `${config.fiload.baseUrl}/upldbase64`;
  },

  /** URL whose response body is a base64-encoded blob (what we render). */
  downloadUrl(filename) {
    if (!filename) return null;
    return `${config.fiload.baseUrl}/gt?filename=${encodeURIComponent(filename)}`;
  },

  /** Same as downloadUrl — kept for API symmetry. */
  previewUrl(filename) {
    return this.downloadUrl(filename);
  },

  /** Fetches /gt and returns the base64 string body. */
  async downloadBase64(filename) {
    const url = this.downloadUrl(filename);
    if (!url) return null;
    const r = await fetch(url);
    const text = (await r.text().catch(() => '')).trim();
    if (!r.ok) {
      log.warn({ status: r.status, filename, snippet: text.slice(0, 200) }, 'fiload:download:error');
      return null;
    }
    return text;
  },

  async health() {
    try {
      const r = await fetch(`${config.fiload.baseUrl}/check`);
      return r.ok;
    } catch (err) {
      log.warn({ err }, 'fiload:health');
      return false;
    }
  },
};
