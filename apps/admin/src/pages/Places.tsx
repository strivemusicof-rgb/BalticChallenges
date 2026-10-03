import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { api, qs } from '../api.ts';
import { useIsAdmin } from '../auth.tsx';
import {
  changedFields,
  Field,
  FormError,
  fromTriState,
  optionalInt,
  optionalText,
  SLUG_RE,
  slugify,
  toTriState,
  type TriState,
} from '../forms.tsx';
import { CategorySelect, StatusBadge } from '../components.tsx';
import { useReference } from '../shared.ts';
import { COUNTRIES, DIFFICULTIES, STATUSES, type Country, type ContentStatus, type Difficulty, type Place } from '../types.ts';
import { Badge, Modal, QueryState, SearchBar, useAction } from '../ui.tsx';
import { ChallengeForm, visitChallengeDraft, type ChallengeDraft } from './Challenges.tsx';

type PlaceInput = Omit<Place, 'id' | 'challengeCount'>;

export function Places() {
  const isAdmin = useIsAdmin();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Place | 'new' | null>(null);
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['places', q],
    queryFn: () => api.get<{ places: Place[] }>(`/v1/admin/places${qs({ q })}`),
  });

  return (
    <>
      <SearchBar onSearch={setQ} placeholder="Search places…">
        <button className="btn-primary" disabled={!isAdmin} title={isAdmin ? undefined : 'Admin only'} onClick={() => setEditing('new')}>
          New place
        </button>
      </SearchBar>
      <QueryState isLoading={isLoading} error={error} empty={data?.places.length === 0} />
      {data && data.places.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th className="num">Challenges</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.places.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>{p.name} {p.temporarilyClosed && <Badge tone="amber">closed</Badge>}</div>
                    <div className="muted small">{p.slug}{p.city ? ` · ${p.city}` : ''}</div>
                  </td>
                  <td>{p.country}</td>
                  <td>{p.categoryId}</td>
                  <td>{p.difficulty}</td>
                  <td className="num">{p.challengeCount}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="nowrap">
                    {isAdmin && (
                      <>
                        <button onClick={() => setEditing(p)}>Edit</button>{' '}
                        <button onClick={() => setChallengeDraft(visitChallengeDraft(p))}>Create visit challenge</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <PlaceForm place={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {challengeDraft && <ChallengeForm challenge={null} draft={challengeDraft} onClose={() => setChallengeDraft(null)} />}
    </>
  );
}

interface PlaceFormState {
  slug: string;
  name: string;
  description: string;
  country: Country;
  regionId: string;
  city: string;
  categoryId: string;
  lat: string;
  lng: string;
  radiusM: string;
  images: string;
  difficulty: Difficulty;
  terrain: string;
  accessibility: string;
  seasonMonths: string;
  estDurationMin: string;
  familyFriendly: TriState;
  dogFriendly: TriState;
  parking: TriState;
  officialUrl: string;
  temporarilyClosed: boolean;
  status: ContentStatus;
}

function toFormState(p: Place | null): PlaceFormState {
  return {
    slug: p?.slug ?? '',
    name: p?.name ?? '',
    description: p?.description ?? '',
    country: p?.country ?? 'LV',
    regionId: p?.regionId != null ? String(p.regionId) : '',
    city: p?.city ?? '',
    categoryId: p?.categoryId ?? '',
    lat: p ? String(p.lat) : '',
    lng: p ? String(p.lng) : '',
    radiusM: String(p?.radiusM ?? 150),
    images: (p?.images ?? []).join('\n'),
    difficulty: p?.difficulty ?? 'casual',
    terrain: p?.terrain ?? '',
    accessibility: p?.accessibility ?? '',
    seasonMonths: (p?.seasonMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).join(', '),
    estDurationMin: p?.estDurationMin != null ? String(p.estDurationMin) : '',
    familyFriendly: toTriState(p?.familyFriendly ?? null),
    dogFriendly: toTriState(p?.dogFriendly ?? null),
    parking: toTriState(p?.parking ?? null),
    officialUrl: p?.officialUrl ?? '',
    temporarilyClosed: p?.temporarilyClosed ?? false,
    status: p?.status ?? 'draft',
  };
}

function toInput(f: PlaceFormState): PlaceInput | string {
  const slug = f.slug.trim();
  if (!SLUG_RE.test(slug)) return 'Slug must be kebab-case (a-z, 0-9, hyphens)';
  if (f.name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!f.categoryId) return 'Category is required';
  const lat = Number(f.lat);
  const lng = Number(f.lng);
  if (f.lat.trim() === '' || !(lat >= 53 && lat <= 60.5)) return 'Latitude must be between 53 and 60.5';
  if (f.lng.trim() === '' || !(lng >= 20 && lng <= 28.5)) return 'Longitude must be between 20 and 28.5';
  const radiusM = Number(f.radiusM);
  if (!Number.isInteger(radiusM) || radiusM < 20 || radiusM > 5000) return 'Radius must be an integer 20–5000 m';
  const seasonMonths = [...new Set(f.seasonMonths.split(/[\s,]+/).filter(Boolean).map(Number))].sort((a, b) => a - b);
  if (seasonMonths.length === 0 || seasonMonths.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) {
    return 'Season months must be numbers 1–12';
  }
  const estDurationMin = optionalInt(f.estDurationMin);
  if (estDurationMin !== null && (!Number.isInteger(estDurationMin) || estDurationMin <= 0)) {
    return 'Duration must be a positive whole number of minutes';
  }
  const images = f.images.split(/\s+/).map((s) => s.trim()).filter(Boolean);

  return {
    slug,
    name: f.name.trim(),
    description: f.description,
    country: f.country,
    regionId: optionalInt(f.regionId),
    city: optionalText(f.city),
    categoryId: f.categoryId,
    lat,
    lng,
    radiusM,
    images,
    difficulty: f.difficulty,
    terrain: optionalText(f.terrain),
    accessibility: optionalText(f.accessibility),
    seasonMonths,
    estDurationMin,
    familyFriendly: fromTriState(f.familyFriendly),
    dogFriendly: fromTriState(f.dogFriendly),
    parking: fromTriState(f.parking),
    officialUrl: optionalText(f.officialUrl),
    temporarilyClosed: f.temporarilyClosed,
    status: f.status,
  };
}

function PlaceForm({ place, onClose }: { place: Place | null; onClose: () => void }) {
  const { data: ref } = useReference();
  const [form, setForm] = useState(() => toFormState(place));
  const [formError, setFormError] = useState<string | null>(null);
  const save = useAction(
    (body: Partial<PlaceInput>) => (place ? api.patch(`/v1/admin/places/${place.id}`, body) : api.post('/v1/admin/places', body)),
    { invalidate: [['places'], ['challenges']], success: place ? 'Place updated' : 'Place created', onSuccess: onClose },
  );

  const set = <K extends keyof PlaceFormState>(key: K, value: PlaceFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const regions = ref?.regions.filter((r) => r.country === form.country) ?? [];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input = toInput(form);
    if (typeof input === 'string') {
      setFormError(input);
      return;
    }
    setFormError(null);
    let body: Partial<PlaceInput> = input;
    if (place) {
      body = changedFields<PlaceInput>(place, input);
      if ('lat' in body || 'lng' in body) Object.assign(body, { lat: input.lat, lng: input.lng });
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
    }
    save.mutate(body);
  }

  return (
    <Modal title={place ? `Edit ${place.name}` : 'New place'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={onSubmit}>
        <Field label="Name *">
          <input
            value={form.name}
            required
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: !place && (f.slug === '' || f.slug === slugify(f.name)) ? slugify(name) : f.slug }));
            }}
          />
        </Field>
        <Field label="Slug *">
          <input value={form.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={(e) => set('slug', e.target.value)} />
        </Field>
        <Field label="Country *">
          <select value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value as Country, regionId: '' }))}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Region">
          <select value={form.regionId} onChange={(e) => set('regionId', e.target.value)}>
            <option value="">—</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="City">
          <input value={form.city} maxLength={80} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Category *">
          <CategorySelect value={form.categoryId} onChange={(v) => set('categoryId', v)} />
        </Field>
        <Field label="Latitude * (53–60.5)">
          <input value={form.lat} required inputMode="decimal" onChange={(e) => set('lat', e.target.value)} />
        </Field>
        <Field label="Longitude * (20–28.5)">
          <input value={form.lng} required inputMode="decimal" onChange={(e) => set('lng', e.target.value)} />
        </Field>
        <Field label="Radius (m)">
          <input type="number" min={20} max={5000} value={form.radiusM} onChange={(e) => set('radiusM', e.target.value)} />
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
        <Field label="Est. duration (min)">
          <input type="number" min={1} value={form.estDurationMin} onChange={(e) => set('estDurationMin', e.target.value)} />
        </Field>
        <Field label="Description" wide>
          <textarea rows={4} maxLength={4000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Terrain">
          <input value={form.terrain} maxLength={200} onChange={(e) => set('terrain', e.target.value)} />
        </Field>
        <Field label="Accessibility">
          <input value={form.accessibility} maxLength={200} onChange={(e) => set('accessibility', e.target.value)} />
        </Field>
        <Field label="Season months" hint="Comma-separated, e.g. 5, 6, 7, 8">
          <input value={form.seasonMonths} onChange={(e) => set('seasonMonths', e.target.value)} />
        </Field>
        <Field label="Official URL">
          <input type="url" value={form.officialUrl} onChange={(e) => set('officialUrl', e.target.value)} />
        </Field>
        <Field label="Image URLs" hint="One per line, max 10" wide>
          <textarea rows={2} value={form.images} onChange={(e) => set('images', e.target.value)} />
        </Field>
        <TriSelect label="Family friendly" value={form.familyFriendly} onChange={(v) => set('familyFriendly', v)} />
        <TriSelect label="Dog friendly" value={form.dogFriendly} onChange={(v) => set('dogFriendly', v)} />
        <TriSelect label="Parking" value={form.parking} onChange={(v) => set('parking', v)} />
        <label className="field checkbox">
          <input type="checkbox" checked={form.temporarilyClosed} onChange={(e) => set('temporarilyClosed', e.target.checked)} />
          <span>Temporarily closed</span>
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

function TriSelect({ label, value, onChange }: { label: string; value: TriState; onChange: (v: TriState) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as TriState)}>
        <option value="">unknown</option>
        <option value="true">yes</option>
        <option value="false">no</option>
      </select>
    </Field>
  );
}