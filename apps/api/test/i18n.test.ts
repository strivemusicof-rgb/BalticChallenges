import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseLang, tr } from '../src/i18n.js';

test('parseLang accepts Latvian and Russian and defaults to English', () => {
  assert.equal(parseLang('lv'), 'lv');
  assert.equal(parseLang('ru-RU,ru;q=0.9'), 'ru');
  assert.equal(parseLang('de-DE'), 'en');
  assert.equal(parseLang(undefined), 'en');
});

test('tr falls back to the English value outside a request', () => {
  assert.equal(tr({ lv: { title: 'Pilis' } }, 'title', 'Castles'), 'Castles');
});
