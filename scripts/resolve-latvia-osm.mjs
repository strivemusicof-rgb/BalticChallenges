// Second pass for scripts/resolve-latvia.mjs: places whose Wikipedia match came from a fuzzy search
// (not the exact article) get coordinates from OpenStreetMap Nominatim instead, and lose the photo
// unless it is on the keep list below.
// Usage: node scripts/resolve-latvia-osm.mjs
import { readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const places = JSON.parse(await readFile(new URL('apps/api/db/content/latvia.json', root), 'utf8'));
const outFile = new URL('apps/api/db/content/resolved.json', root);
const resolved = JSON.parse(await readFile(outFile, 'utf8'));
const UA = 'BalticChallenges/0.1 (kvarcaiela@gmail.com)';
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
function km(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Fuzzy matches that are still the right subject (same building or a photo of the place itself).
const KEEP_PHOTO = new Set(['swedish-gate', 'bastejkalns', 'cat-house', 'national-opera-riga', 'krimulda-castle', 'kipsala',
  'aleksupite-waterfall', 'kuldiga-brick-bridge', 'pavilosta', 'ligatne-village', 'ogre-blue-hills', 'ragakapa', 'cena-bog',
  'tervete-nature-park', 'birini-palace', 'gaizinkalns', 'daugavpils-rothko', 'preili-manor-park', 'jelgava-trinity-tower']);

// Exact article titles after redirects, 50 per request.
const exact = new Map();
for (let i = 0; i < places.length; i += 50) {
  const titles = places.slice(i, i + 50).map((p) => p[1]);
  const url = `https://lv.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1', titles: titles.join('|') })}`;
  const res = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
  const map = new Map();
  for (const n of res.query?.normalized ?? []) map.set(n.from, n.to);
  for (const r of res.query?.redirects ?? []) map.set(r.from, r.to);
  const found = new Set((res.query?.pages ?? []).filter((p) => !p.missing).map((p) => p.title));
  for (const t of titles) {
    let final = t;
    for (let k = 0; k < 3 && map.has(final); k++) final = map.get(final);
    if (found.has(final)) exact.set(t, final);
  }
}

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'jsonv2', limit: '3', countrycodes: 'lv' })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'lv' } });
  await sleep(1100);
  return res.ok ? res.json() : [];
}

for (const [slug, title, , , city, lat, lng, , , , en] of places) {
  const entry = resolved[slug];
  if (!entry) continue;
  entry.direct = entry.verified && entry.article === exact.get(title);
  if (entry.direct || entry.osm) continue;
  const near = { lat, lng };
  let hit = null;
  for (const q of [`${title}, ${city}`, title, `${en[0]}, ${city}`]) {
    const results = await nominatim(q);
    hit = results.map((r) => ({ lat: +r.lat, lng: +r.lon, name: r.display_name })).find((r) => km(r, near) <= 15);
    if (hit) break;
  }
  if (hit) {
    entry.lat = hit.lat;
    entry.lng = hit.lng;
    entry.osm = hit.name.slice(0, 120);
    entry.verified = true;
    entry.movedKm = +km(hit, near).toFixed(2);
  } else {
    // Our estimate stays; a wrong search hit is worse than our own coordinates.
    entry.lat = lat;
    entry.lng = lng;
    entry.verified = false;
    entry.movedKm = null;
  }
  if (entry.credit && !KEEP_PHOTO.has(slug)) {
    delete entry.credit;
    delete entry.photoSource;
    await rm(new URL(`.photo-cache/latvia/${slug}.jpg`, root), { force: true });
  }
  console.log(hit ? 'osm' : '!! ', slug, hit ? `${entry.movedKm} km · ${entry.osm}` : '(kept estimate)', entry.credit ? '+photo' : '');
  await writeFile(outFile, JSON.stringify(resolved, null, 2));
}
await writeFile(outFile, JSON.stringify(resolved, null, 2));
const all = Object.values(resolved);
console.log(`\ndirect ${all.filter((e) => e.direct).length}, osm ${all.filter((e) => e.osm).length}, unverified ${all.filter((e) => !e.verified).length}, photos ${all.filter((e) => e.credit).length}`);
