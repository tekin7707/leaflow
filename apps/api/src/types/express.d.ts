import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      isManager?: boolean;
    }
  }
}

export {};
