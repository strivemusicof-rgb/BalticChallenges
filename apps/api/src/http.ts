import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { AuthHooks } from './auth/plugin.js';
import type { TokenService } from './auth/tokens.js';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { checkText } from './domain/moderation.js';
import { badRequest } from './errors.js';
import type { PhotoStore } from './services/photos.js';
import type { PushService } from './services/push.js';

export interface Deps {
  config: Config;
  db: Db;
  tokens: TokenService;
  auth: AuthHooks;
  photos: PhotoStore;
  push: PushService;
}

export type RoutePlugin = (app: FastifyInstance, deps: Deps) => void | Promise<void>;

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(
      'validation_failed',
      'Request is invalid',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

export function assertCleanText(field: string, ...values: (string | undefined | null)[]) {
  for (const value of values) {
    if (!value) continue;
    const verdict = checkText(value);
    if (!verdict.ok) {
      throw badRequest(
        verdict.reason,
        verdict.reason === 'link_spam' ? 'Too many links' : 'Please keep it friendly — that wording is not allowed',
        [{ path: field, message: verdict.reason }],
      );
    }
  }
}

export const PageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // Opaque cursor: ISO timestamp of the last item seen.
  before: z.iso.datetime({ offset: true }).optional(),
});

export const Coordinates = {
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
};

export const CountrySchema = z.enum(['LV', 'LT', 'EE']);
export const DifficultySchema = z.enum(['casual', 'explorer', 'adventurer', 'extreme']);
export const UuidSchema = z.uuid();
