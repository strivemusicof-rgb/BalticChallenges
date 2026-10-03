-- Specialist collections from the roadmap: lighthouses, viewpoints, wild nature, plus a trails collection.
INSERT INTO collections (slug, title, description, icon, kind, country, xp_reward, status, sort, i18n) VALUES
  ('baltic-lighthouses', 'Lighthouses', 'Historic lighthouses on the Baltic coast and islands.', '🗼', 'category', NULL, 400, 'published', 120,
   '{"lv":{"title":"Bākas","description":"Vēsturiskas bākas Baltijas piekrastē un salās."},"ru":{"title":"Маяки","description":"Исторические маяки на балтийском побережье и островах."}}'),
  ('baltic-viewpoints', 'Viewpoints', 'Towers, hills and decks with the best views in the Baltics.', '🌅', 'category', NULL, 500, 'published', 130,
   '{"lv":{"title":"Skatu punkti","description":"Torņi, kalni un laukumi ar labākajiem skatiem Baltijā."},"ru":{"title":"Смотровые площадки","description":"Башни, холмы и площадки с лучшими видами Балтии."}}'),
  ('wild-nature', 'Wild Nature', 'Bogs, waterfalls, cliffs and dunes away from the cities.', '🌲', 'category', NULL, 700, 'published', 140,
   '{"lv":{"title":"Savvaļas daba","description":"Purvi, ūdenskritumi, klintis un kāpas tālu no pilsētām."},"ru":{"title":"Дикая природа","description":"Болота, водопады, скалы и дюны вдали от городов."}}'),
  ('baltic-trails', 'Baltic Trails', 'Multi-stop walks and road trips through the three countries.', '🥾', 'special', NULL, 1000, 'published', 15,
   '{"lv":{"title":"Baltijas takas","description":"Pastaigas un ceļojumi ar vairākām pieturām trijās valstīs."},"ru":{"title":"Тропы Балтии","description":"Прогулки и поездки с несколькими точками по трём странам."}}')
ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE collection_src (collection text, challenges text[]) ON COMMIT DROP;
INSERT INTO collection_src VALUES
  ('baltic-lighthouses', ARRAY['kopu-lighthouse', 'pakri-lighthouse', 'slitere-lighthouse', 'cape-kolka']),
  ('baltic-viewpoints', ARRAY['kohtuotsa-viewpoint', 'three-crosses', 'st-peters-riga', 'tallinn-tv-tower', 'vilnius-tv-tower', 'gediminas-tower', 'toome-hill']),
  ('wild-nature', ARRAY['kemeri-bog', 'viru-bog', 'riisa-bog-trail', 'jagala-waterfall', 'keila-waterfall', 'valaste-waterfall',
                        'panga-cliff', 'venta-rapid', 'gutmanis-cave', 'zvartes-iezis', 'parnidis-dune', 'kaali-crater']);

-- Place slugs map to their visit/discover challenge.
INSERT INTO collection_items (collection_id, challenge_id, position)
SELECT c.id, ch.id, item.position
FROM collection_src s
JOIN collections c ON c.slug = s.collection
CROSS JOIN LATERAL unnest(s.challenges) WITH ORDINALITY AS item(place_slug, position)
JOIN places p ON p.slug = item.place_slug
JOIN challenges ch ON ch.place_id = p.id AND ch.type IN ('visit', 'discover')
ON CONFLICT DO NOTHING;

INSERT INTO collection_items (collection_id, challenge_id, position)
SELECT c.id, ch.id, row_number() OVER (ORDER BY ch.slug)
FROM collections c CROSS JOIN challenges ch
WHERE c.slug = 'baltic-trails' AND ch.type = 'multi_step'
ON CONFLICT DO NOTHING;
