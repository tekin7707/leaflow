import { ZodError } from 'zod';
import { log } from './log.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg, details) => new HttpError(409, msg, details);

/** Wrap async route handlers so errors hit the central handler. */
export const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid request',
      details: err.flatten(),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.status === 400 ? 'bad_request' : err.status === 404 ? 'not_found' : 'http_error',
      message: err.message,
      details: err.details,
    });
  }
  log.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
}
