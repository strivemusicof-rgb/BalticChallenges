// Checks apps/api/db/content/latvia.json against Latvian Wikipedia: takes the article's coordinates
// when they are within 15 km of ours, and downloads one openly licensed photo per place.
// Results go to apps/api/db/content/resolved.json and photos to .photo-cache/latvia/<slug>.jpg.
// Usage: node scripts/resolve-latvia.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const places = JSON.parse(await readFile(new URL('apps/api/db/content/latvia.json', root), 'utf8'));
const outFile = new URL('apps/api/db/content/resolved.json', root);
const photos = new URL('.photo-cache/latvia/', root);
const UA = 'BalticChallenges/0.1 (kvarcaiela@gmail.com)';
const FREE = /^(cc[- ]by|cc0|public domain|pd|attribution)/i;
const MAX_KM = 15;

const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
function km(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
async function wiki(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429) { await sleep(3000 * (i + 1)); continue; }
    return r.json();
  }
  throw new Error('rate limited');
}
const pageProps = { prop: 'coordinates|pageimages', piprop: 'name', colimit: 'max', redirects: '1' };

async function findPage(title, near) {
  const direct = await wiki('lv.wikipedia.org', { action: 'query', titles: title, ...pageProps });
  const candidates = (direct.query?.pages ?? []).filter((p) => !p.missing);
  if (!candidates.some((p) => p.coordinates)) {
    const search = await wiki('lv.wikipedia.org', { action: 'query', generator: 'search', gsrsearch: title, gsrlimit: '5', ...pageProps });
    candidates.push(...(search.query?.pages ?? []).sort((a, b) => a.index - b.index));
  }
  for (const page of candidates) {
    const c = page.coordinates?.[0];
    if (!c) continue;
    const at = { lat: c.lat, lng: c.lon };
    if (km(at, near) <= MAX_KM) return { page, at };
  }
  // No coordinates close enough: keep ours, but still use the first matching article for a photo.
  return { page: candidates[0] ?? null, at: null };
}

async function photo(fileName) {
  if (!fileName || /\.(svg|png|gif)$/i.test(fileName)) return null;
  const info = await wiki('commons.wikimedia.org', {
    action: 'query', titles: `File:${fileName}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280',
  });
  const ii = info.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii?.thumburl) return null;
  const m = ii.extmetadata ?? {};
  const license = strip(m.LicenseShortName?.value);
  if (!FREE.test(license) && !/public domain/i.test(license)) return null;
  return { url: ii.thumburl, credit: `${strip(m.Artist?.value) || 'Unknown'} · ${license} · Wikimedia Commons`.slice(0, 200), source: ii.descriptionurl };
}

await mkdir(photos, { recursive: true });
let resolved = {};
try { resolved = JSON.parse(await readFile(outFile, 'utf8')); } catch {}

for (const [slug, title, , , , lat, lng] of places) {
  if (resolved[slug]) continue;
  const near = { lat, lng };
  try {
    const { page, at } = await findPage(title, near);
    const entry = { article: page?.title ?? null, lat: at?.lat ?? lat, lng: at?.lng ?? lng, verified: Boolean(at), movedKm: at ? +km(at, near).toFixed(2) : null };
    const img = await photo(page?.pageimage);
    if (img) {
      const res = await fetch(img.url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        await writeFile(new URL(`${slug}.jpg`, photos), Buffer.from(await res.arrayBuffer()));
        entry.credit = img.credit;
        entry.photoSource = img.source;
      }
    }
    resolved[slug] = entry;
    console.log(entry.verified ? 'ok ' : '?? ', slug, '←', entry.article, entry.movedKm ?? '', entry.credit ? 'photo' : 'no photo');
  } catch (error) {
    console.log('ERR', slug, error.message);
  }
  await writeFile(outFile, JSON.stringify(resolved, null, 2));
  await sleep(300);
}
const all = Object.values(resolved);
console.log(`\n${all.filter((e) => e.verified).length}/${places.length} verified, ${all.filter((e) => e.credit).length} photos`);
