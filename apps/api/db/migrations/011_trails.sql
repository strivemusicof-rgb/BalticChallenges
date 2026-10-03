-- Multi-checkpoint trails (challenge type F). Each step is an existing place, visited in order.
-- The challenge's own place is the first step, so it shows on the map and uses that place's photo.

CREATE TEMP TABLE trail_src (
  slug text, title text, description text, category text, country text, difficulty text, xp integer,
  lv_title text, lv_description text, ru_title text, ru_description text, stops text[]
) ON COMMIT DROP;

INSERT INTO trail_src VALUES
  ('trail-riga-old-town', 'Rīga Old Town Walk',
   'Walk from the Freedom Monument through the medieval centre to St. Peter''s tower. Check in at each stop in order.',
   'old-towns', 'LV', 'casual', 500,
   'Vecrīgas pastaiga', 'Pastaiga no Brīvības pieminekļa caur viduslaiku centru līdz Sv. Pētera tornim. Atzīmējies katrā pieturā pēc kārtas.',
   'Прогулка по Старой Риге', 'Прогулка от памятника Свободы через средневековый центр к башне церкви Святого Петра. Отмечайтесь в каждой точке по порядку.',
   ARRAY['freedom-monument', 'riga-cathedral', 'house-of-blackheads', 'st-peters-riga']),
  ('trail-gauja-castles', 'Gauja Valley Castles',
   'Three castles and the largest grotto in the Baltics on both banks of the Gauja. Check in at each stop in order.',
   'castles', 'LV', 'explorer', 650,
   'Gaujas ielejas pilis', 'Trīs pilis un lielākā ala Baltijā abos Gaujas krastos. Atzīmējies katrā pieturā pēc kārtas.',
   'Замки долины Гауи', 'Три замка и крупнейший грот Балтии на обоих берегах Гауи. Отмечайтесь в каждой точке по порядку.',
   ARRAY['sigulda-castle', 'krimulda-manor', 'gutmanis-cave', 'turaida-castle']),
  ('trail-vilnius-old-town', 'Vilnius Old Town Trail',
   'From the Gate of Dawn to the Hill of Three Crosses, through the cathedral, the castle tower and Užupis.',
   'old-towns', 'LT', 'explorer', 650,
   'Viļņas vecpilsētas taka', 'No Ausmas vārtiem līdz Trīs krustu kalnam caur katedrāli, pils torni un Užupi.',
   'Тропа по Старому Вильнюсу', 'От Ворот Зари до Холма Трёх крестов — через собор, замковую башню и Ужупис.',
   ARRAY['gate-of-dawn', 'vilnius-cathedral', 'gediminas-tower', 'uzupis', 'three-crosses']),
  ('trail-tallinn-old-town', 'Tallinn Old Town Walk',
   'Up Toompea hill and down into the Hanseatic town, with the best viewpoint on the way.',
   'old-towns', 'EE', 'casual', 500,
   'Tallinas vecpilsētas pastaiga', 'Augšup Tompea kalnā un lejup Hanzas pilsētā, pa ceļam labākais skatu punkts.',
   'Прогулка по Старому Таллину', 'Подъём на Тоомпеа и спуск в ганзейский город с лучшей смотровой площадкой по пути.',
   ARRAY['toompea-castle', 'nevsky-cathedral', 'kohtuotsa-viewpoint', 'tallinn-old-town']),
  ('trail-curonian-spit', 'Curonian Spit Road Trip',
   'Witches, dunes and a fishing village on the UNESCO-listed spit. Best done by car or bike.',
   'coast', 'LT', 'adventurer', 800,
   'Kuršu kāpas ceļojums', 'Raganas, kāpas un zvejnieku ciems UNESCO sarakstā iekļautajā kāpā. Vislabāk ar auto vai velosipēdu.',
   'Путешествие по Куршской косе', 'Ведьмы, дюны и рыбацкая деревня на косе из списка ЮНЕСКО. Лучше всего на машине или велосипеде.',
   ARRAY['witches-hill', 'parnidis-dune', 'nida']);

INSERT INTO challenges (slug, title, description, type, category_id, place_id, country, difficulty, xp_reward,
                        verification, status, i18n)
SELECT s.slug, s.title, s.description, 'multi_step', s.category, p.id, s.country::country_code, s.difficulty::difficulty,
       s.xp, 'gps', 'published',
       jsonb_build_object('lv', jsonb_build_object('title', s.lv_title, 'description', s.lv_description),
                          'ru', jsonb_build_object('title', s.ru_title, 'description', s.ru_description))
FROM trail_src s JOIN places p ON p.slug = s.stops[1]
ON CONFLICT (slug) DO NOTHING;

INSERT INTO challenge_steps (challenge_id, position, title, kind, place_id, geog, radius_m)
SELECT ch.id, stop.position, p.name, 'visit', p.id, p.geog, p.radius_m
FROM trail_src s
JOIN challenges ch ON ch.slug = s.slug
CROSS JOIN LATERAL unnest(s.stops) WITH ORDINALITY AS stop(slug, position)
JOIN places p ON p.slug = stop.slug
ON CONFLICT (challenge_id, position) DO NOTHING;
