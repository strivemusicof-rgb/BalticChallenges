import { AsyncLocalStorage } from 'node:async_hooks';

import type { FastifyInstance } from 'fastify';

export type Lang = 'en' | 'lv' | 'ru';

/** Content translations as stored in the `i18n` jsonb columns: {"lv": {"title": "…"}, "ru": {…}}. */
export type I18n = Partial<Record<'lv' | 'ru', Record<string, string>>> | null | undefined;

const storage = new AsyncLocalStorage<Lang>();

export function parseLang(header: string | string[] | undefined): Lang {
  const value = (Array.isArray(header) ? header[0] : header)?.trim().slice(0, 2).toLowerCase();
  return value === 'lv' || value === 'ru' ? value : 'en';
}

/** Language of the request being handled (from Accept-Language); English outside a request. */
export function currentLang(): Lang {
  return storage.getStore() ?? 'en';
}

/** Translated field, falling back to the English base value. */
export function tr(i18n: I18n, field: string, fallback: string): string;
export function tr(i18n: I18n, field: string, fallback: string | null): string | null;
export function tr(i18n: I18n, field: string, fallback: string | null): string | null {
  const lang = currentLang();
  if (lang === 'en') return fallback;
  return i18n?.[lang]?.[field] || fallback;
}

/** Runs every request inside its language context so services can call `tr` without extra parameters. */
export function registerLanguage(app: FastifyInstance) {
  app.addHook('onRequest', (request, _reply, done) => {
    storage.run(parseLang(request.headers['accept-language']), done);
  });
}
