// Downloads one openly licensed Wikimedia Commons photo per place into .photo-cache/
// Usage: node scripts/fetch-place-photos.mjs
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const API = process.env.API_URL ?? 'https://vps-1a18ee51.vps.ovh.net';
const OUT = new URL('../.photo-cache/', import.meta.url);
const UA = 'BalticChallenges/0.1 (kvarcaiela@gmail.com)';
const FREE = /^(cc[- ]by|cc0|public domain|pd|attribution)/i;

const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
async function wiki(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 3000 * (i + 1))); continue; }
    return r.json();
  }
  throw new Error('rate limited');
}

async function findPhoto(p) {
  const queries = [`${p.name} ${p.city ?? ''}`.trim(), p.name];
  for (const q of queries) {
    const res = await wiki('en.wikipedia.org', {
      action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '3', prop: 'pageimages', piprop: 'name', pilimit: '3',
    });
    const pages = Object.values(res.query?.pages ?? {}).sort((a, b) => a.index - b.index);
    for (const pg of pages) {
      if (!pg.pageimage || /\.(svg|png)$/i.test(pg.pageimage)) continue;
      const info = await wiki('commons.wikimedia.org', {
        action: 'query', titles: `File:${pg.pageimage}`, prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1280',
      });
      const ii = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
      if (!ii?.thumburl) continue;
      const m = ii.extmetadata ?? {};
      const license = strip(m.LicenseShortName?.value);
      if (!FREE.test(license) && !/public domain/i.test(license)) continue;
      return {
        url: ii.thumburl,
        credit: `${strip(m.Artist?.value) || 'Unknown'} · ${license} · Wikimedia Commons`,
        source: ii.descriptionurl,
        page: pg.title,
      };
    }
  }
  return null;
}

await mkdir(OUT, { recursive: true });
const { challenges } = await (await fetch(`${API}/v1/challenges?limit=200`)).json();
const places = new Map();
for (const c of challenges) if (c.place) places.set(c.place.id, { ...c.place, country: c.country });

let credits = {};
try { credits = JSON.parse(await readFile(new URL('credits.json', OUT), 'utf8')); } catch {}
let ok = 0;
const missing = [];
for (const p of places.values()) {
  if (credits[p.id]) { ok++; continue; }
  try {
    const hit = await findPhoto(p);
    if (!hit) { missing.push(p.name); continue; }
    const img = await fetch(hit.url, { headers: { 'User-Agent': UA } });
    if (!img.ok) { missing.push(`${p.name} (download ${img.status})`); continue; }
    await writeFile(new URL(`${p.id}.jpg`, OUT), Buffer.from(await img.arrayBuffer()));
    credits[p.id] = { name: p.name, credit: hit.credit.slice(0, 200), source: hit.source };
    ok++;
    console.log('✓', p.name, '←', hit.page);
  } catch (e) { missing.push(`${p.name} (${e.message})`); }
  await new Promise((s) => setTimeout(s, 400));
  await writeFile(new URL('credits.json', OUT), JSON.stringify(credits, null, 2));
}
await writeFile(new URL('credits.json', OUT), JSON.stringify(credits, null, 2));
console.log(`\n${ok}/${places.size} photos. Missing:\n${missing.join('\n')}`);
