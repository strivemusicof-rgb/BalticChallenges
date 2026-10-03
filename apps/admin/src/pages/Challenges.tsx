import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { api, qs } from '../api.ts';
import { useIsAdmin } from '../auth.tsx';
import { changedFields, Field, FormError, optionalInt, SLUG_RE, slugify } from '../forms.tsx';
import { useReference } from '../shared.ts';
import {
  CHALLENGE_TYPES,
  COUNTRIES,
  DIFFICULTIES,
  STATUSES,
  VERIFICATIONS,
  type Challenge,
  type ChallengeType,
  type ContentStatus,
  type Country,
  type Difficulty,
  type Place,
  type Verification,
} from '../types.ts';
import { CategorySelect, StatusBadge } from '../components.tsx';
import { Badge, formatDate, Modal, QueryState, SearchBar, useAction } from '../ui.tsx';

type ChallengeInput = Omit<Challenge, 'id' | 'placeName' | 'completions'>;
export type ChallengeDraft = Partial<ChallengeInput>;

const PLACE_REQUIRED = new Set<ChallengeType>(['visit', 'discover']);

export function visitChallengeDraft(place: Place): ChallengeDraft {
  return {
    slug: `visit-${place.slug}`.slice(0, 80),
    title: `Visit ${place.name}`.slice(0, 120),
    type: 'visit',
    verification: 'gps',
    categoryId: place.categoryId,
    xpReward: 150,
    placeId: place.id,
    country: place.country,
    regionId: place.regionId,
    difficulty: place.difficulty,
  };
}

export function Challenges() {
  const isAdmin = useIsAdmin();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Challenge | 'new' | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['challenges', q],
    queryFn: () => api.get<{ challenges: Challenge[] }>(`/v1/admin/challenges${qs({ q })}`),
  });

  return (
    <>
      <SearchBar onSearch={setQ} placeholder="Search challenges…">
        <button className="btn-primary" disabled={!isAdmin} title={isAdmin ? undefined : 'Admin only'} onClick={() => setEditing('new')}>
          New challenge
        </button>
      </SearchBar>
      <QueryState isLoading={isLoading} error={error} empty={data?.challenges.length === 0} />
      {data && data.challenges.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Place</th>
                <th className="num">XP</th>
                <th>Window</th>
                <th className="num">Completions</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.challenges.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div>{c.title} {c.isPro && <Badge tone="amber">PRO</Badge>}</div>
                    <div className="muted small">{c.slug}</div>
                  </td>
                  <td>
                    {c.type}
                    <div className="muted small">{c.verification}</div>
                  </td>
                  <td>{c.placeName ?? '—'}</td>
                  <td className="num">{c.xpReward}</td>
                  <td className="small">
                    {c.startsAt || c.endsAt ? `${formatDate(c.startsAt)} → ${formatDate(c.endsAt)}` : '—'}
                  </td>
                  <td className="num">{c.completions}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{isAdmin && <button onClick={() => setEditing(c)}>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ChallengeForm challenge={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

interface ChallengeFormState {
  slug: string;
  title: string;
  description: string;
  type: ChallengeType;
  categoryId: string;
  placeId: string;
  country: Country | '';
  regionId: string;
  difficulty: Difficulty;
  xpReward: string;
  verification: Verification;
  startsAt: string;
  endsAt: string;
  isPro: boolean;
  status: ContentStatus;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function sameInstant(a: unknown, b: unknown): boolean {
  const t = (v: unknown) => (typeof v === 'string' ? new Date(v).getTime() : null);
  return t(a) === t(b);
}

function toFormState(c: ChallengeDraft): ChallengeFormState {
  return {
    slug: c.slug ?? '',
    title: c.title ?? '',
    description: c.description ?? '',
    type: c.type ?? 'visit',
    categoryId: c.categoryId ?? '',
    placeId: c.placeId ?? '',
    country: c.country ?? '',
    regionId: c.regionId != null ? String(c.regionId) : '',
    difficulty: c.difficulty ?? 'casual',
    xpReward: String(c.xpReward ?? 100),
    verification: c.verification ?? 'gps',
    startsAt: toLocalInput(c.startsAt),
    endsAt: toLocalInput(c.endsAt),
    isPro: c.isPro ?? false,
    status: c.status ?? 'draft',
  };
}

function toInput(f: ChallengeFormState): ChallengeInput | string {
  const slug = f.slug.trim();
  if (!SLUG_RE.test(slug)) return 'Slug must be kebab-case (a-z, 0-9, hyphens)';
  if (f.title.trim().length < 2) return 'Title must be at least 2 characters';
  if (!f.categoryId) return 'Category is required';
  const xpReward = Number(f.xpReward);
  if (!Number.isInteger(xpReward) || xpReward < 1 || xpReward > 5000) return 'XP reward must be an integer 1–5000';
  if (PLACE_REQUIRED.has(f.type) && !f.placeId) return `A place is required for ${f.type} challenges`;
  const startsAt = fromLocalInput(f.startsAt);
  const endsAt = fromLocalInput(f.endsAt);
  if (startsAt && endsAt && startsAt >= endsAt) return 'End must be after start';

  return {
    slug,
    title: f.title.trim(),
    description: f.description,
    type: f.type,
    categoryId: f.categoryId,
    placeId: f.placeId || null,
    country: f.country || null,
    regionId: optionalInt(f.regionId),
    difficulty: f.difficulty,
    xpReward,
    verification: f.verification,
    startsAt,
    endsAt,
    isPro: f.isPro,
    status: f.status,
  };
}

export function ChallengeForm({ challenge, draft, onClose }: { challenge: Challenge | null; draft?: ChallengeDraft; onClose: () => void }) {
  const { data: ref } = useReference();
  const { data: placesData } = useQuery({
    queryKey: ['places', ''],
    queryFn: () => api.get<{ places: Place[] }>('/v1/admin/places'),
  });
  const [form, setForm] = useState(() => toFormState(challenge ?? draft ?? {}));
  const [formError, setFormError] = useState<string | null>(null);
  const save = useAction(
    (body: Partial<ChallengeInput>) =>
      challenge ? api.patch(`/v1/admin/challenges/${challenge.id}`, body) : api.post('/v1/admin/challenges', body),
    { invalidate: [['challenges'], ['places']], success: challenge ? 'Challenge updated' : 'Challenge created', onSuccess: onClose },
  );

  const set = <K extends keyof ChallengeFormState>(key: K, value: ChallengeFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const places = [...(placesData?.places ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const regions = ref?.regions.filter((r) => r.country === form.country) ?? [];

  function onPlaceChange(placeId: string) {
    const place = places.find((p) => p.id === placeId);
    setForm((f) => ({
      ...f,
      placeId,
      ...(place && {
        categoryId: f.categoryId || place.categoryId,
        country: place.country,
        regionId: place.regionId != null ? String(place.regionId) : '',
      }),
    }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input = toInput(form);
    if (typeof input === 'string') {
      setFormError(input);
      return;
    }
    setFormError(null);
    let body: Partial<ChallengeInput> = input;
    if (challenge) {
      body = changedFields<ChallengeInput>(challenge, input, { startsAt: sameInstant, endsAt: sameInstant });
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
    }
    save.mutate(body);
  }

  return (
    <Modal title={challenge ? `Edit ${challenge.title}` : 'New challenge'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={onSubmit}>
        <Field label="Title *">
          <input
            value={form.title}
            required
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, slug: !challenge && (f.slug === '' || f.slug === slugify(f.title)) ? slugify(title) : f.slug }));
            }}
          />
        </Field>
        <Field label="Slug *">
          <input value={form.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={(e) => set('slug', e.target.value)} />
        </Field>
        <Field label="Type *">
          <select value={form.type} onChange={(e) => set('type', e.target.value as ChallengeType)}>
            {CHALLENGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Verification">
          <select value={form.verification} onChange={(e) => set('verification', e.target.value as Verification)}>
            {VERIFICATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label={PLACE_REQUIRED.has(form.type) ? 'Place *' : 'Place'} wide>
          <select value={form.placeId} onChange={(e) => onPlaceChange(e.target.value)}>
            <option value="">—</option>
            {form.placeId && !places.some((p) => p.id === form.placeId) && (
              <option value={form.placeId}>{challenge?.placeName ?? form.placeId}</option>
            )}
            {places.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.country}, {p.slug})</option>)}
          </select>
        </Field>
        <Field label="Category *">
          <CategorySelect value={form.categoryId} onChange={(v) => set('categoryId', v)} />
        </Field>
        <Field label="XP reward * (1–5000)">
          <input type="number" min={1} max={5000} required value={form.xpReward} onChange={(e) => set('xpReward', e.target.value)} />
        </Field>
        <Field label="Country">
          <select value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value as Country | '', regionId: '' }))}>
            <option value="">—</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Region">
          <select value={form.regionId} disabled={!form.country} onChange={(e) => set('regionId', e.target.value)}>
            <option value="">—</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Difficulty">
          <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value as ContentStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Starts at" hint="Local time; empty = no start">
          <input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
        </Field>
        <Field label="Ends at" hint="Local time; empty = no end">
          <input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
        </Field>
        <Field label="Description" wide>
          <textarea rows={4} maxLength={4000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <label className="field checkbox">
          <input type="checkbox" checked={form.isPro} onChange={(e) => set('isPro', e.target.checked)} />
          <span>PRO only</span>
        </label>
        <div className="field-wide">
          <FormError message={formError} />
          <div className="actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
