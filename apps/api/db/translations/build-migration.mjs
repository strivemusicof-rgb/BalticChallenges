// Generates db/migrations/010_translations.sql from the JSON files in this folder.
// Usage: node db/translations/build-migration.mjs
import { readFile, writeFile } from 'node:fs/promises';

const here = new URL('./', import.meta.url);
const places = JSON.parse(await readFile(new URL('places.json', here), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('catalog.json', here), 'utf8'));

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const json = (value) => `${q(JSON.stringify(value))}::jsonb`;

const lines = [
  '-- Latvian and Russian translations for content. English stays in the base columns;',
  '-- i18n holds {"lv": {...}, "ru": {...}} and the API falls back to English per field.',
  "ALTER TABLE categories ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}';",
  "ALTER TABLE places ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}';",
  "ALTER TABLE challenges ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}';",
  "ALTER TABLE collections ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}';",
  "ALTER TABLE achievements ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}';",
  "ALTER TABLE goals ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}';",
  '',
];

for (const [id, names] of Object.entries(catalog.categories)) {
  lines.push(`UPDATE categories SET i18n = ${json({ lv: { name: names.lv }, ru: { name: names.ru } })} WHERE id = ${q(id)};`);
}
for (const [slug, [lv, ru]] of Object.entries(places).map(([slug, value]) => [slug, [value.lv, value.ru]])) {
  const value = { lv: { name: lv[0], description: lv[1] }, ru: { name: ru[0], description: ru[1] } };
  lines.push(`UPDATE places SET i18n = ${json(value)} WHERE slug = ${q(slug)};`);
}
for (const table of ['collections', 'goals']) {
  for (const [slug, value] of Object.entries(catalog[table])) {
    const i18n = { lv: { title: value.lv[0], description: value.lv[1] }, ru: { title: value.ru[0], description: value.ru[1] } };
    lines.push(`UPDATE ${table} SET i18n = ${json(i18n)} WHERE slug = ${q(slug)};`);
  }
}
for (const [id, value] of Object.entries(catalog.achievements)) {
  const i18n = { lv: { title: value.lv[0], description: value.lv[1] }, ru: { title: value.ru[0], description: value.ru[1] } };
  lines.push(`UPDATE achievements SET i18n = ${json(i18n)} WHERE id = ${q(id)};`);
}

lines.push(
  '',
  '-- Visit/Discover challenges reuse their place text: the title is the place name and the',
  '-- description is the place description plus the radius hint.',
  `UPDATE challenges ch SET i18n = jsonb_build_object(
  'lv', jsonb_build_object('title', p.i18n->'lv'->>'name',
        'description', (p.i18n->'lv'->>'description') || ' Pietuvojies ' || p.radius_m || ' m attālumā, lai izpildītu.'),
  'ru', jsonb_build_object('title', p.i18n->'ru'->>'name',
        'description', (p.i18n->'ru'->>'description') || ' Подойдите ближе чем на ' || p.radius_m || ' м, чтобы выполнить.'))
FROM places p
WHERE p.id = ch.place_id AND ch.type IN ('visit', 'discover') AND p.i18n ? 'lv';`,
  '',
);

await writeFile(new URL('../migrations/010_translations.sql', here), lines.join('\n'));
console.log(`wrote ${lines.length} lines`);
