import type { MiddlewareHandler } from 'hono';

export const dbContextMiddleware: MiddlewareHandler = async (c, next) => {
  await next();
};
