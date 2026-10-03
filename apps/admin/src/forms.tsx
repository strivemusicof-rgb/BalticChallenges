import type { ReactNode } from 'react';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function optionalInt(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

export type TriState = '' | 'true' | 'false';

export function toTriState(value: boolean | null): TriState {
  return value === null ? '' : value ? 'true' : 'false';
}

export function fromTriState(value: TriState): boolean | null {
  return value === '' ? null : value === 'true';
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Returns only the keys of `next` whose value differs from `original`. */
export function changedFields<T extends object>(original: Partial<T>, next: T, compare: Partial<Record<keyof T, (a: unknown, b: unknown) => boolean>> = {}): Partial<T> {
  const diff: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    const eq = compare[key] ?? same;
    if (!eq(original[key], next[key])) diff[key] = next[key];
  }
  return diff;
}

export function Field({ label, children, hint, wide }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={wide ? 'field field-wide' : 'field'}>
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p className="banner banner-error">{message}</p> : null;
}
